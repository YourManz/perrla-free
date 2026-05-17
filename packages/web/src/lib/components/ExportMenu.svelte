<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';
  import type { Paper, RenderedCitation } from '@perrla-free/core';
  import { CitationEngine } from '@perrla-free/core';
  import { activePaper, currentStyle, sources, notify } from '../store.js';
  import { exportToFile } from '../storage.js';
  import { exportToPdfPrint } from '@perrla-free/core';
  import { exportToDocx } from '@perrla-free/core';
  import { downloadMarkdown } from '@perrla-free/core';

  let isOpen = false;
  let isExporting = false;

  let stylesCache: Record<string, string> = {};
  let localeCache = '';

  async function fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return res.text();
  }

  // Map internal style keys to the official CSL filename on disk
  const styleFileMap: Record<string, string> = {
    apa7: 'apa7',
    mla9: 'mla9',
    chicago: 'chicago',
    ieee: 'ieee',
    turabian: 'turabian-author-date',
  };

  async function getRenderedRefs(paper: Paper): Promise<RenderedCitation[]> {
    if (paper.sources.length === 0) return [];

    const styleNames = ['apa7', 'mla9', 'chicago', 'ieee', 'turabian'] as const;
    const styles: Record<string, string> = {};

    await Promise.all(
      styleNames.map(async (name) => {
        if (!stylesCache[name]) {
          const filename = styleFileMap[name] ?? name;
          stylesCache[name] = await fetchText(`${base}/styles/${filename}.csl`);
        }
        styles[name] = stylesCache[name];
      })
    );

    if (!localeCache) {
      localeCache = await fetchText(`${base}/locales/locales-en-US.xml`);
    }

    const engine = new CitationEngine(
      styles as Parameters<ConstructorParameters<typeof CitationEngine>[0]>[0],
      { 'en-US': localeCache }
    );
    engine.load(paper.sources, paper.settings.style);
    return engine.formatReferences();
  }

  async function exportDocx() {
    const paper = $activePaper;
    if (!paper) return;
    isExporting = true;
    try {
      const refs = await getRenderedRefs(paper);
      const blob = await exportToDocx(paper, {
        includeReferences: true,
        references: refs,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitize(paper.title)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('DOCX downloaded', 'success');
    } catch (err) {
      notify(`DOCX export failed: ${err}`, 'error');
    } finally {
      isExporting = false;
      isOpen = false;
    }
  }

  async function exportPdf() {
    const paper = $activePaper;
    if (!paper) return;
    isExporting = true;
    try {
      const refs = await getRenderedRefs(paper);
      exportToPdfPrint(paper, { includeReferences: true, references: refs });
      notify('Print dialog opened — choose "Save as PDF"', 'info');
    } catch (err) {
      notify(`PDF export failed: ${err}`, 'error');
    } finally {
      isExporting = false;
      isOpen = false;
    }
  }

  async function exportMd() {
    const paper = $activePaper;
    if (!paper) return;
    isExporting = true;
    try {
      const refs = await getRenderedRefs(paper);
      downloadMarkdown(paper, {
        includeReferences: true,
        references: refs,
        includeYamlFrontmatter: true,
      });
      notify('Markdown downloaded', 'success');
    } catch (err) {
      notify(`Markdown export failed: ${err}`, 'error');
    } finally {
      isExporting = false;
      isOpen = false;
    }
  }

  function exportPerrla() {
    const paper = $activePaper;
    if (!paper) return;
    exportToFile(paper);
    notify('Paper exported as .perrla file', 'success');
    isOpen = false;
  }

  function sanitize(name: string): string {
    return name.replace(/[^a-z0-9\-_\s]/gi, '').replace(/\s+/g, '-').slice(0, 80) || 'paper';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') isOpen = false;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="export-menu" class:open={isOpen}>
  <button
    class="export-trigger btn-secondary"
    on:click={() => isOpen = !isOpen}
    disabled={!$activePaper || isExporting}
    type="button"
    aria-haspopup="true"
    aria-expanded={isOpen}
  >
    {isExporting ? 'Exporting...' : 'Export ▾'}
  </button>

  {#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="export-backdrop" on:click={() => isOpen = false}></div>
    <div class="export-dropdown" role="menu">
      <button class="export-item" on:click={exportDocx} role="menuitem" type="button">
        <span class="export-icon">📄</span>
        <div class="export-item-text">
          <span class="export-item-name">Word Document (.docx)</span>
          <span class="export-item-desc">For Microsoft Word, Google Docs</span>
        </div>
      </button>
      <button class="export-item" on:click={exportPdf} role="menuitem" type="button">
        <span class="export-icon">🖨</span>
        <div class="export-item-text">
          <span class="export-item-name">PDF (via Print)</span>
          <span class="export-item-desc">Opens print dialog — choose Save as PDF</span>
        </div>
      </button>
      <button class="export-item" on:click={exportMd} role="menuitem" type="button">
        <span class="export-icon">📝</span>
        <div class="export-item-text">
          <span class="export-item-name">Markdown (.md)</span>
          <span class="export-item-desc">Plain text with formatting</span>
        </div>
      </button>
      <hr class="export-divider" />
      <button class="export-item" on:click={exportPerrla} role="menuitem" type="button">
        <span class="export-icon">💾</span>
        <div class="export-item-text">
          <span class="export-item-name">perrla-free Archive (.perrla)</span>
          <span class="export-item-desc">Full backup — re-import on any device</span>
        </div>
      </button>
    </div>
  {/if}
</div>

<style>
  .export-menu {
    position: relative;
    display: inline-flex;
  }

  .export-trigger {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .export-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .export-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    min-width: 260px;
    overflow: hidden;
    padding: var(--space-1);
  }

  .export-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .export-item:hover {
    background: var(--color-surface-2);
  }

  .export-icon {
    font-size: 18px;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }

  .export-item-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .export-item-name {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .export-item-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .export-divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--space-1) 0;
  }
</style>
