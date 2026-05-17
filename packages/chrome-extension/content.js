/**
 * PERRLA Free — Reference Capture
 * Content script: extracts page metadata and responds to popup requests.
 */

(function () {
  'use strict';

  /**
   * Get the text content of the first matching meta tag.
   * @param {string[]} selectors
   * @returns {string}
   */
  function getMeta(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const val = el.getAttribute('content') || el.getAttribute('href') || el.textContent;
        if (val && val.trim()) return val.trim();
      }
    }
    return '';
  }

  /**
   * Extract a 4-digit year from a date string.
   * @param {string} dateStr
   * @returns {string}
   */
  function extractYear(dateStr) {
    if (!dateStr) return '';
    const match = dateStr.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
  }

  /**
   * Look for a DOI in meta tags or doi.org links on the page.
   * @returns {string}
   */
  function findDoi() {
    // Try meta tag first
    const metaDoi = getMeta(
      'meta[name="citation_doi"]',
      'meta[name="DC.Identifier"]',
      'meta[name="dc.identifier"]'
    );
    if (metaDoi) {
      const m = metaDoi.match(/10\.\d{4,}\/\S+/);
      if (m) return m[0];
    }

    // Scan for doi.org links
    const links = document.querySelectorAll('a[href*="doi.org/"]');
    for (const link of links) {
      const m = link.href.match(/doi\.org\/(10\.\d{4,}\/\S+)/);
      if (m) return m[1];
    }

    // Try schema.org JSON-LD
    const jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLds) {
      try {
        const data = JSON.parse(script.textContent);
        const doi = data.doi || (data['@graph'] && data['@graph'][0] && data['@graph'][0].doi);
        if (doi) return doi;
      } catch (_) {
        // ignore parse errors
      }
    }

    return '';
  }

  /**
   * Extract structured metadata from the current page.
   * @returns {Object}
   */
  function extractPageMeta() {
    // Title
    const title =
      getMeta('meta[property="og:title"]', 'meta[name="title"]') ||
      document.title ||
      '';

    // Author
    const author = getMeta(
      'meta[name="author"]',
      'meta[name="article:author"]',
      'meta[name="DC.creator"]',
      'meta[name="dc.creator"]',
      'meta[name="citation_author"]'
    );

    // Year from various date sources
    const rawDate = getMeta(
      'meta[property="article:published_time"]',
      'meta[property="og:updated_time"]',
      'meta[name="citation_publication_date"]',
      'meta[name="DC.date"]',
      'meta[name="dc.date"]',
      'meta[name="date"]'
    );

    // Also try schema.org datePublished
    let year = extractYear(rawDate);
    if (!year) {
      const jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLds) {
        try {
          const data = JSON.parse(script.textContent);
          const datePublished =
            data.datePublished ||
            (data['@graph'] && data['@graph'][0] && data['@graph'][0].datePublished);
          if (datePublished) {
            year = extractYear(datePublished);
            if (year) break;
          }
        } catch (_) {
          // ignore
        }
      }
    }

    // Publisher / site name
    const publisher =
      getMeta('meta[property="og:site_name"]', 'meta[name="publisher"]', 'meta[name="DC.publisher"]') ||
      window.location.hostname.replace(/^www\./, '');

    // URL
    const url = window.location.href;

    // DOI
    const doi = findDoi();

    // Journal
    const journal = getMeta(
      'meta[name="citation_journal_title"]',
      'meta[name="prism.publicationName"]'
    );

    // Source type heuristic
    const sourceType = doi ? 'journal' : 'website';

    return {
      title: title.trim(),
      author: author.trim(),
      year: year.trim(),
      publisher: publisher.trim(),
      url: url,
      doi: doi.trim(),
      journal: journal.trim(),
      sourceType,
    };
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message.type === 'getPageMeta') {
      sendResponse(extractPageMeta());
    }
    // Return true to indicate we may respond asynchronously (required for some Chrome versions)
    return true;
  });
})();
