<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { base } from '$app/paths';
  import { CitationEngine } from '@perrla-free/core';
  import type { RenderedCitation, Source } from '@perrla-free/core';
  import { activePaper, currentStyle, sources, notify } from '../store.js';

  // CSL styles imported as raw strings
  // In SvelteKit with Vite, these must be in /static/ and fetched,
  // or imported as ?raw. We fetch them from /styles/.
  let engine: CitationEngine | null = null;
  let renderedRefs: RenderedCitation[] = [];
  let isLoading = false;
  let loadError: string | null = null;

  // Cache loaded styles/locales to avoid repeated fetches
  let stylesCache: Record<string, string> = {};
  let localeCache: Record<string, string> = '';

  async function fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  }

  // Map internal style keys to the official CSL filename on disk
  const styleFileMap: Record<string, string> = {
    apa7: 'apa',
    mla9: 'modern-language-association',
    chicago: 'chicago-author-date',
    ieee: 'ieee',
    turabian: 'turabian-author-date',
  };

  async function loadStyles(): Promise<{ styles: Record<string, string>; locale: string }> {
    const styleNames = ['apa7', 'mla9', 'chicago', 'ieee', 'turabian'] as const;
    const styles: Record<string, string> = {};

    await Promise.all(
      styleNames.map(async (name) => {
        if (stylesCache[name]) {
          styles[name] = stylesCache[name];
        } else {
          const filename = styleFileMap[name] ?? name;
          const xml = await fetchText(`${base}/styles/${filename}.csl`);
          stylesCache[name] = xml;
          styles[name] = xml;
        }
      })
    );

    let locale: string;
    if (localeCache) {
      locale = localeCache;
    } else {
      locale = await fetchText(`${base}/locales/locales-en-US.xml`);
      localeCache = locale;
    }

    return { styles: styles as Record<string, string>, locale };
  }

  async function renderReferences() {
    const paper = $activePaper;
    if (!paper || paper.sources.length === 0) {
      renderedRefs = [];
      return;
    }

    isLoading = true;
    loadError = null;

    try {
      const { styles, locale } = await loadStyles();

      if (!engine) {
        engine = new CitationEngine(
          styles as Parameters<typeof CitationEngine.prototype.load>[1] extends never ? never : Parameters<ConstructorParameters<typeof CitationEngine>[0]>[0],
          { 'en-US': locale }
        );
      }

      engine.load(paper.sources, paper.settings.style);
      renderedRefs = engine.formatReferences();
    } catch (err) {
      console.error('Citation engine error:', err);
      loadError = `Could not render citations: ${err}`;
      // Fallback: render raw title list
      renderedRefs = paper.sources.map((s) => ({
        sourceId: s.id,
        inText: '',
        reference: `<span>${s.fields.authors ?? ''} (${s.fields.year ?? 'n.d.'}). <em>${s.fields.title ?? 'Untitled'}</em>.</span>`,
      }));
    } finally {
      isLoading = false;
    }
  }

  // Re-render when paper or style changes
  $: if ($activePaper) {
    renderReferences();
  }

  // Copy a reference to clipboard
  async function copyRef(html: string) {
    const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied to clipboard', 'success');
    } catch {
      notify('Could not copy — try selecting and copying manually', 'error');
    }
  }

  // Style label
  const styleLabels: Record<string, string> = {
    apa7: 'APA 7th Edition',
    mla9: 'MLA 9th Edition',
    chicago: 'Chicago 17th',
    ieee: 'IEEE',
    turabian: 'Turabian 9th Edition',
  };

  $: styleLabel = styleLabels[$currentStyle] ?? $currentStyle;
  $: refHeading = $currentStyle === 'mla9'
    ? 'Works Cited'
    : ($currentStyle === 'chicago' || $currentStyle === 'turabian')
      ? 'Bibliography'
      : 'References';
</script>

<div class="ref-panel">
  <div class="ref-header">
    <h2 class="ref-title">{refHeading}</h2>
    <span class="style-badge">{styleLabel}</span>
  </div>

  {#if !$activePaper}
    <div class="ref-empty">
      <p>Open a paper to see its references.</p>
    </div>
  {:else if $sources.length === 0}
    <div class="ref-empty">
      <p>No sources added yet.</p>
      <p class="ref-empty-hint">Use the citation builder to add your first source.</p>
    </div>
  {:else if isLoading}
    <div class="ref-loading">
      <p>Formatting references...</p>
    </div>
  {:else if loadError}
    <div class="ref-error">{loadError}</div>
  {:else}
    <div class="ref-list">
      {#each renderedRefs as ref (ref.sourceId)}
        {@const source = $sources.find((s) => s.id === ref.sourceId)}
        <div class="ref-entry">
          <div class="ref-text">{@html ref.reference}</div>
          <div class="ref-actions">
            <button
              class="ref-action-btn"
              on:click={() => copyRef(ref.reference)}
              title="Copy reference text"
              type="button"
            >Copy</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if $activePaper && $sources.length > 0}
    <div class="ref-footer">
      <p class="ref-count">{$sources.length} source{$sources.length !== 1 ? 's' : ''}</p>
    </div>
  {/if}
</div>

<style>
  .ref-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
  }

  .ref-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .ref-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .style-badge {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .ref-empty, .ref-loading, .ref-error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .ref-empty-hint {
    margin-top: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .ref-error {
    color: var(--color-danger);
  }

  .ref-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3) var(--space-4);
  }

  .ref-entry {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .ref-entry:last-child {
    border-bottom: none;
  }

  .ref-text {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.8;
    color: #111;
    padding-left: 24px;
    text-indent: -24px;
    /* Hanging indent for reference entries */
  }

  :global(.ref-text em) { font-style: italic; }

  .ref-actions {
    margin-top: var(--space-1);
    display: flex;
    gap: var(--space-1);
  }

  .ref-action-btn {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 1px var(--space-2);
    border-radius: var(--radius-sm);
  }

  .ref-action-btn:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  .ref-footer {
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .ref-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
</style>
