<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Editor from '$lib/components/Editor.svelte';
  import {
    openPaper,
    saveActivePaper,
    activePaper,
    activePaperId,
    isLoading,
    notify,
    sources,
    activePanel,
    editingSourceId,
    currentStyle,
  } from '$lib/store.js';
  import type { Source } from '@perrla-free/core';
  import type { Editor as TiptapEditor } from '@tiptap/core';
  import { insertCitation, buildCitationLabel } from '$lib/tiptap/CitationNode.js';

  $: paperId = $page.params.id;

  let loadError: string | null = null;
  let mounted = false;
  /** Bound to the Editor component — used for insertCitation */
  let editorInstance: TiptapEditor | null = null;

  onMount(async () => {
    mounted = true;
    await loadCurrentPaper();
  });

  // Reload if the ID in the URL changes
  $: if (mounted && paperId && paperId !== $activePaperId) {
    loadCurrentPaper();
  }

  async function loadCurrentPaper() {
    loadError = null;
    try {
      await openPaper(paperId);
    } catch (err) {
      loadError = `Could not load paper: ${err}`;
      notify(loadError, 'error');
    }
  }

  function handleSourceClick(source: Source) {
    editingSourceId.set(source.id);
    activePanel.set('citation-builder');
  }

  function handleCiteSource(source: Source, sourceIndex: number) {
    if (!editorInstance) {
      notify('Editor not ready', 'error');
      return;
    }
    const label = buildCitationLabel(
      $currentStyle,
      source.fields.authors,
      source.fields.year,
      sourceIndex
    );
    insertCitation(editorInstance, source.id, label);
    notify(`Inserted citation ${label}`, 'success');
  }

  // Auto-save status indicator
  let saveStatus: 'saved' | 'saving' | 'unsaved' = 'saved';
  let saveStatusTimeout: ReturnType<typeof setTimeout>;

  function onContentChange() {
    saveStatus = 'saving';
    clearTimeout(saveStatusTimeout);
    saveStatusTimeout = setTimeout(() => {
      saveStatus = 'saved';
    }, 1200);
  }

  onDestroy(() => {
    clearTimeout(saveStatusTimeout);
  });
</script>

<svelte:head>
  <title>{$activePaper?.title ?? 'Paper'} — perrla-free</title>
</svelte:head>

<div class="paper-view">
  {#if $isLoading}
    <div class="loading-state">
      <p>Loading paper...</p>
    </div>
  {:else if loadError}
    <div class="error-state">
      <p>{loadError}</p>
      <button class="btn-secondary" on:click={() => goto('/')} type="button">
        Back to papers
      </button>
    </div>
  {:else if $activePaper}
    <!-- Save status indicator -->
    <div class="save-status" class:saving={saveStatus === 'saving'}>
      {#if saveStatus === 'saving'}
        Saving...
      {:else}
        Saved
      {/if}
    </div>

    <!-- Sources quick-access bar (when there are sources) -->
    {#if $sources.length > 0}
      <div class="sources-bar" role="toolbar" aria-label="Sources">
        <span class="sources-bar-label">Sources:</span>
        <div class="sources-chips">
          {#each $sources as source, i (source.id)}
            <span class="source-chip-group">
              <button
                class="source-chip"
                on:click={() => handleSourceClick(source)}
                title="Edit this source"
                type="button"
              >
                {source.fields.authors?.split(';')[0]?.split(',')[0]?.trim() ?? 'Unknown'}
                {#if source.fields.year}
                  ({source.fields.year})
                {/if}
              </button>
              <button
                class="source-chip-cite"
                on:click={() => handleCiteSource(source, i)}
                title="Insert in-text citation"
                type="button"
              >cite</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- The editor -->
    <div class="editor-wrapper">
      <Editor
        paper={$activePaper}
        bind:editor={editorInstance}
        on:contentChange={onContentChange}
      />
    </div>
  {:else}
    <div class="error-state">
      <p>Paper not found.</p>
      <button class="btn-secondary" on:click={() => goto('/')} type="button">
        Back to papers
      </button>
    </div>
  {/if}
</div>

<style>
  .paper-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* Save status */
  .save-status {
    position: absolute;
    top: var(--space-2);
    right: var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    z-index: 5;
    transition: color 0.2s;
    pointer-events: none;
  }

  .save-status.saving {
    color: var(--color-warning);
  }

  /* Sources quick bar */
  .sources-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    overflow-x: auto;
  }

  .sources-bar-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
    flex-shrink: 0;
  }

  .sources-chips {
    display: flex;
    gap: var(--space-1);
    flex-wrap: nowrap;
  }

  .source-chip-group {
    display: inline-flex;
    align-items: center;
    border-radius: 99px;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .source-chip {
    display: inline-flex;
    align-items: center;
    padding: 1px var(--space-2);
    background: var(--color-surface-2);
    border: none;
    border-right: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s;
    font-family: var(--font-ui);
  }

  .source-chip:hover {
    background: var(--color-accent-light);
    color: var(--color-accent);
  }

  .source-chip-cite {
    display: inline-flex;
    align-items: center;
    padding: 1px var(--space-2);
    background: var(--color-surface-2);
    border: none;
    font-size: var(--font-size-xs);
    color: var(--color-accent);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s;
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .source-chip-cite:hover {
    background: var(--color-accent);
    color: white;
  }

  /* Editor */
  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Loading / error states */
  .loading-state,
  .error-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
