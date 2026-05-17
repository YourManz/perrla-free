/**
 * PERRLA Free — Reference Capture
 * Popup controller: wires up the UI, communicates with the background service
 * worker and the content script of the active tab.
 */

'use strict';

// ─── Utilities ────────────────────────────────────────────────────────────────

/** @param {string} id @returns {HTMLElement} */
const $ = (id) => document.getElementById(id);

/** Send a message to the background service worker. */
function bgMsg(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

/** Send a message to the active tab's content script. */
async function tabMsg(type, payload = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found');
  return chrome.tabs.sendMessage(tab.id, { type, ...payload });
}

/**
 * Flash a status message (success/error) that auto-hides after 1.5 s.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {'success'|'error'} type
 */
function flash(el, text, type = 'success') {
  el.textContent = text;
  el.className = `status-flash ${type} visible`;
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 1500);
}

/** Copy text to clipboard; returns true on success. */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // Fallback for restricted contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  }
}

// ─── Citation Formatters ──────────────────────────────────────────────────────

/**
 * Format a reference as APA 7.
 * Author, A. A. (Year). Title. Publisher. URL / https://doi.org/…
 */
function formatApa(ref) {
  const author = ref.author || 'Unknown Author';
  const year = ref.year || 'n.d.';
  const title = ref.title || 'Untitled';
  const publisher = ref.publisher || '';
  const urlPart = ref.doi
    ? `https://doi.org/${ref.doi}`
    : ref.url || '';

  const parts = [
    `${author} (${year}). ${title}.`,
    publisher && `${publisher}.`,
    urlPart,
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Format a reference as MLA 9.
 * Author. "Title." Publisher, Year, URL.
 */
function formatMla(ref) {
  const author = ref.author || 'Unknown Author';
  const title = ref.title || 'Untitled';
  const publisher = ref.publisher || '';
  const year = ref.year || 'n.d.';
  const url = ref.doi ? `https://doi.org/${ref.doi}` : ref.url || '';

  const parts = [
    `${author}.`,
    `"${title}."`,
    publisher && `${publisher},`,
    `${year},`,
    url,
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Format a reference as Chicago (author-date).
 * Author. Year. "Title." Publisher. URL.
 */
function formatChicago(ref) {
  const author = ref.author || 'Unknown Author';
  const year = ref.year || 'n.d.';
  const title = ref.title || 'Untitled';
  const publisher = ref.publisher || '';
  const url = ref.doi ? `https://doi.org/${ref.doi}` : ref.url || '';

  const parts = [
    `${author}. ${year}. "${title}."`,
    publisher && `${publisher}.`,
    url,
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Format a reference as IEEE.
 * [n] A. Author, "Title," Publisher, Year. [Online]. Available: URL.
 */
function formatIeee(ref, index = 1) {
  const author = ref.author || 'Unknown Author';
  const title = ref.title || 'Untitled';
  const publisher = ref.publisher || '';
  const year = ref.year || 'n.d.';
  const url = ref.doi ? `https://doi.org/${ref.doi}` : ref.url || '';

  const parts = [
    `[${index}] ${author},`,
    `"${title},"`,
    publisher && `${publisher},`,
    `${year}.`,
    url && `[Online]. Available: ${url}.`,
  ].filter(Boolean);

  return parts.join(' ');
}

function formatRef(ref, style, index = 1) {
  switch (style) {
    case 'mla9': return formatMla(ref);
    case 'chicago': return formatChicago(ref);
    case 'ieee': return formatIeee(ref, index);
    default: return formatApa(ref);
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const data = await chrome.storage.local.get(['citationStyle', 'defaultSourceType']);
  return {
    citationStyle: data.citationStyle || 'apa7',
    defaultSourceType: data.defaultSourceType || 'website',
  };
}

async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

// ─── Capture Tab ──────────────────────────────────────────────────────────────

const captureStatus = $('capture-status');
const loadingMsg = $('loading-msg');

async function populateForm() {
  loadingMsg.style.display = 'block';

  try {
    const meta = await tabMsg('getPageMeta');
    loadingMsg.style.display = 'none';

    $('f-title').value = meta.title || '';
    $('f-author').value = meta.author || '';
    $('f-year').value = meta.year || '';
    $('f-source-type').value = meta.sourceType || 'website';
    $('f-publisher').value = meta.journal || meta.publisher || '';
    $('f-doi').value = meta.doi || '';
    $('f-url').value = meta.url || '';
  } catch (err) {
    loadingMsg.style.display = 'none';
    // Content script may not be injected on chrome:// pages etc — that's OK.
    // The user can fill in the form manually.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) $('f-url').value = tab.url;
    flash(captureStatus, 'Could not extract metadata from this page. Fill in manually.', 'error');
  }
}

$('ref-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const ref = {
    title: $('f-title').value.trim(),
    author: $('f-author').value.trim(),
    year: $('f-year').value.trim(),
    sourceType: $('f-source-type').value,
    publisher: $('f-publisher').value.trim(),
    doi: $('f-doi').value.trim(),
    url: $('f-url').value.trim(),
  };

  if (!ref.title && !ref.url) {
    flash(captureStatus, 'Please enter at least a title or URL.', 'error');
    return;
  }

  const result = await bgMsg('saveReference', { ref });
  if (result.ok) {
    flash(captureStatus, `Saved! (${result.count} in library)`, 'success');
  } else {
    flash(captureStatus, 'Error saving reference.', 'error');
  }
});

// ─── Settings toggle ───────────────────────────────────────────────────────────

$('settings-toggle').addEventListener('click', () => {
  const panel = $('settings-panel');
  const btn = $('settings-toggle');
  const isOpen = panel.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', String(isOpen));
});

$('s-citation-style').addEventListener('change', async () => {
  const style = $('s-citation-style').value;
  await saveSettings({ citationStyle: style });
});

$('s-default-source').addEventListener('change', async () => {
  const defaultSourceType = $('s-default-source').value;
  await saveSettings({ defaultSourceType });
});

// ─── Saved Tab ────────────────────────────────────────────────────────────────

const savedStatus = $('saved-status');
const refList = $('ref-list');
const refsEmpty = $('refs-empty');
const exportBar = $('export-bar');

let currentRefs = [];
let currentStyle = 'apa7';

async function refreshRefList() {
  const result = await bgMsg('getRefs');
  currentRefs = (result.refs || []).sort((a, b) => b.savedAt - a.savedAt);

  $('refs-count').textContent =
    currentRefs.length === 1 ? '1 saved' : `${currentRefs.length} saved`;

  if (currentRefs.length === 0) {
    refsEmpty.style.display = 'block';
    refList.style.display = 'none';
    exportBar.style.display = 'none';
    return;
  }

  refsEmpty.style.display = 'none';
  refList.style.display = 'flex';
  exportBar.style.display = 'flex';

  refList.innerHTML = '';
  currentRefs.forEach((ref, i) => {
    const li = document.createElement('li');
    li.className = 'ref-card';
    li.dataset.url = ref.url;

    const metaParts = [
      ref.author || '',
      ref.year ? `(${ref.year})` : '',
      ref.sourceType ? ref.sourceType.charAt(0).toUpperCase() + ref.sourceType.slice(1) : '',
    ].filter(Boolean);

    li.innerHTML = `
      <div class="ref-card-title">${escHtml(ref.title || 'Untitled')}</div>
      <div class="ref-card-meta">${escHtml(metaParts.join(' · '))}</div>
      <div class="ref-card-actions">
        <button class="btn btn-secondary btn-sm copy-apa-btn" data-index="${i}">Copy APA</button>
        <button class="btn btn-secondary btn-sm copy-mla-btn" data-index="${i}">Copy MLA</button>
        <button class="btn btn-danger btn-sm remove-btn">Remove</button>
      </div>
    `;
    refList.appendChild(li);
  });

  // Bind per-card buttons
  refList.querySelectorAll('.copy-apa-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ref = currentRefs[+btn.dataset.index];
      await copyToClipboard(formatApa(ref));
      flash(savedStatus, 'Copied APA citation!', 'success');
    });
  });

  refList.querySelectorAll('.copy-mla-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ref = currentRefs[+btn.dataset.index];
      await copyToClipboard(formatMla(ref));
      flash(savedStatus, 'Copied MLA citation!', 'success');
    });
  });

  refList.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.ref-card');
      const url = card.dataset.url;
      await bgMsg('removeRef', { url });
      await refreshRefList();
      flash(savedStatus, 'Reference removed.', 'success');
    });
  });
}

$('clear-all-btn').addEventListener('click', async () => {
  if (!currentRefs.length) return;
  if (!confirm(`Remove all ${currentRefs.length} saved reference(s)?`)) return;
  await bgMsg('clearRefs');
  await refreshRefList();
  flash(savedStatus, 'Library cleared.', 'success');
});

$('export-apa-btn').addEventListener('click', async () => {
  const text = currentRefs.map((r, i) => formatRef(r, 'apa7', i + 1)).join('\n\n');
  await copyToClipboard(text);
  flash(savedStatus, `Copied ${currentRefs.length} APA reference(s)!`, 'success');
});

$('export-mla-btn').addEventListener('click', async () => {
  const text = currentRefs.map((r, i) => formatRef(r, 'mla9', i + 1)).join('\n\n');
  await copyToClipboard(text);
  flash(savedStatus, `Copied ${currentRefs.length} MLA reference(s)!`, 'success');
});

$('export-all-btn').addEventListener('click', async () => {
  const settings = await loadSettings();
  const text = currentRefs.map((r, i) => formatRef(r, settings.citationStyle, i + 1)).join('\n\n');
  await copyToClipboard(text);
  flash(savedStatus, `Copied ${currentRefs.length} reference(s) as ${settings.citationStyle.toUpperCase()}!`, 'success');
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    $(`panel-${target}`).classList.add('active');

    if (target === 'saved') refreshRefList();
  });
});

// ─── HTML escaping ────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async function init() {
  // Load settings and apply to UI
  const settings = await loadSettings();
  currentStyle = settings.citationStyle;
  $('s-citation-style').value = settings.citationStyle;
  $('s-default-source').value = settings.defaultSourceType || 'website';

  // Populate the capture form with active tab metadata
  await populateForm();
})();
