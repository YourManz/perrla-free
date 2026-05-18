<script lang="ts">
  import type { Source } from '@perrla-free/core';
  import { parseRIS, parseBibTeX } from '$lib/import.js';
  import { saveToLibrary } from '$lib/storage.js';
  import { refreshLibrary, notify } from '$lib/store.js';

  let fileInput: HTMLInputElement;
  let pending: Source[] = [];
  let isImporting = false;
  let fileName = '';

  async function handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileName = file.name;
    const text = await file.text();

    try {
      if (file.name.toLowerCase().endsWith('.ris')) {
        pending = parseRIS(text);
      } else if (file.name.toLowerCase().endsWith('.bib')) {
        pending = parseBibTeX(text);
      } else {
        notify('Unsupported format — use .ris or .bib', 'error');
        return;
      }

      if (pending.length === 0) {
        notify('No sources found in file', 'error');
      }
    } catch (err) {
      notify(`Parse error: ${err}`, 'error');
    } finally {
      input.value = '';
    }
  }

  async function confirmImport() {
    isImporting = true;
    let count = 0;
    try {
      for (const source of pending) {
        await saveToLibrary(source);
        count++;
      }
      await refreshLibrary();
      notify(`Imported ${count} source${count !== 1 ? 's' : ''} to library`, 'success');
      pending = [];
      fileName = '';
    } catch (err) {
      notify(`Import failed: ${err}`, 'error');
    } finally {
      isImporting = false;
    }
  }

  function cancel() {
    pending = [];
    fileName = '';
  }

  function getPreviewLabel(s: Source): string {
    const title = s.fields.title ?? '(No title)';
    const year = s.fields.year ? ` (${s.fields.year})` : '';
    const author = s.fields.authors ? ` — ${s.fields.authors.split(';')[0].trim()}` : '';
    return `${title}${author}${year}`;
  }
</script>

<div class="import-wrap">
  <button
    class="import-cits-btn"
    type="button"
    on:click={() => fileInput.click()}
    title="Import citations from .ris or .bib file"
  >
    Import Citations
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept=".ris,.bib"
    on:change={handleFile}
    style="display:none"
    aria-hidden="true"
  />

  {#if pending.length > 0}
    <div class="preview-overlay">
      <div class="preview-panel">
        <div class="preview-header">
          <span class="preview-title">Import from {fileName}</span>
          <span class="preview-count">{pending.length} source{pending.length !== 1 ? 's' : ''}</span>
        </div>
        <ul class="preview-list">
          {#each pending as s (s.id)}
            <li class="preview-item">{getPreviewLabel(s)}</li>
          {/each}
        </ul>
        <div class="preview-actions">
          <button class="btn-secondary" type="button" on:click={cancel}>Cancel</button>
          <button class="btn-primary" type="button" on:click={confirmImport} disabled={isImporting}>
            {isImporting ? 'Importing…' : `Add ${pending.length} to Library`}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .import-wrap {
    position: relative;
  }

  .import-cits-btn {
    font-size: var(--font-size-xs);
    padding: 4px var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-family: var(--font-ui);
    white-space: nowrap;
    transition: background 0.1s;
  }

  .import-cits-btn:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  .preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .preview-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 480px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .preview-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .preview-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .preview-list {
    list-style: none;
    overflow-y: auto;
    flex: 1;
    padding: var(--space-2) var(--space-4);
  }

  .preview-item {
    font-size: var(--font-size-xs);
    color: var(--color-text);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-item:last-child {
    border-bottom: none;
  }

  .preview-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
</style>
