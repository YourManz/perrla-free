<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import Editor from '$lib/components/Editor.svelte';
  import PaperTypeSelector from '$lib/components/PaperTypeSelector.svelte';
  import FormattingTip from '$lib/components/FormattingTip.svelte';
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
    currentPaperType,
    addToLibrary,
  } from '$lib/store.js';
  import type { Source } from '@perrla-free/core';
  import type { Editor as TiptapEditor } from '@tiptap/core';
  import { insertCitation, buildCitationLabel } from '$lib/tiptap/CitationNode.js';

  $: paperId = $page.params.id;

  let loadError: string | null = null;
  let mounted = false;
  /** Bound to the Editor component — used for insertCitation */
  let editorInstance: TiptapEditor | null = null;

  /** Whether the paper type popover is open */
  let typePickerOpen = false;

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

  // ---- Paper type helpers ----

  const paperTypeLabels: Record<string, string> = {
    research: 'Research Paper',
    discussion: 'Discussion Post',
    reference_list: 'Reference List',
    annotated_bibliography: 'Annotated Bibliography',
  };

  const paperTypePlaceholders: Record<string, string> = {
    research: 'Start writing your paper here...',
    discussion: 'Write your discussion response here. Aim for 250–500 words...',
    reference_list: 'Your references will appear here. Add sources using the + Source button.',
    annotated_bibliography: 'Add sources, then write 150-word annotations below each reference.',
  };

  $: isEmptyContent =
    $activePaper &&
    JSON.stringify($activePaper.content) ===
      JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [] }] });

  $: ghostPlaceholder = paperTypePlaceholders[$currentPaperType] ?? paperTypePlaceholders.research;

  // ---- Formatting tips by style + type ----
  interface TipConfig {
    id: string;
    message: string;
    style: 'info' | 'warning';
  }

  $: activeTip = getActiveTip($currentStyle, $currentPaperType);

  function getActiveTip(style: string, type: string): TipConfig | null {
    if (type === 'discussion') {
      return {
        id: 'discussion-tip',
        message: "Discussion posts typically don't need a title page — check your course instructions.",
        style: 'info',
      };
    }
    if (type === 'annotated_bibliography') {
      return {
        id: 'annotated-bib-tip',
        message: 'Each annotation should summarize, assess, and reflect on the source (150 words).',
        style: 'info',
      };
    }
    if (style === 'apa7') {
      return {
        id: 'apa7-tip',
        message: 'APA 7th requires a running head (abbreviated title ≤ 50 chars) and page numbers.',
        style: 'info',
      };
    }
    if (style === 'mla9') {
      return {
        id: 'mla9-tip',
        message: 'MLA 9th does not use a separate title page for most assignments.',
        style: 'info',
      };
    }
    if (style === 'chicago') {
      return {
        id: 'chicago-tip',
        message: 'Chicago author-date uses (Author Year) in-text citations.',
        style: 'info',
      };
    }
    return null;
  }

  // ---- Annotated bibliography: per-source annotation word count ----

  function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function annotationClass(text: string): string {
    const count = wordCount(text);
    if (count > 175 || (count < 100 && count > 0)) return 'annotation--warn';
    return '';
  }

  function getAnnotationValue(e: Event): string {
    return (e.currentTarget as HTMLTextAreaElement).value;
  }

  /** Live annotation text map: sourceId → annotation string */
  let annotations: Record<string, string> = {};

  $: if ($activePaper) {
    // Load annotation text from source.fields.note for each source
    for (const src of $activePaper.sources) {
      if (!(src.id in annotations)) {
        annotations[src.id] = src.fields.note ?? '';
      }
    }
  }

  let annotationSaveTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

  async function handleAnnotationInput(sourceId: string, value: string) {
    annotations[sourceId] = value;
    clearTimeout(annotationSaveTimeouts[sourceId]);
    annotationSaveTimeouts[sourceId] = setTimeout(async () => {
      const paper = $activePaper;
      if (!paper) return;
      const updatedSources = paper.sources.map((s) =>
        s.id === sourceId
          ? { ...s, fields: { ...s.fields, note: value }, updatedAt: Date.now() }
          : s
      );
      await saveActivePaper({ sources: updatedSources });
    }, 600);
  }
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
      <button class="btn-secondary" on:click={() => goto(base || '/')} type="button">
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

    <!-- Paper type selector button in toolbar area -->
    <div class="paper-type-bar">
      <button
        class="paper-type-btn"
        on:click={() => (typePickerOpen = !typePickerOpen)}
        type="button"
        title="Change paper type"
        aria-haspopup="dialog"
        aria-expanded={typePickerOpen}
      >
        <span class="paper-type-btn-label">
          {paperTypeLabels[$currentPaperType] ?? 'Paper Type'}
        </span>
        <span class="paper-type-btn-caret" aria-hidden="true">▾</span>
      </button>
    </div>

    <!-- Paper type popover -->
    {#if typePickerOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="type-picker-overlay"
        on:click|self={() => (typePickerOpen = false)}
        role="none"
      >
        <div class="type-picker-popover" role="dialog" aria-modal="true" aria-label="Select paper type">
          <PaperTypeSelector
            on:typechange={() => (typePickerOpen = false)}
          />
        </div>
      </div>
    {/if}

    <!-- Formatting tip -->
    {#if activeTip}
      <div class="tip-wrapper">
        <FormattingTip
          tipId={activeTip.id}
          message={activeTip.message}
          style={activeTip.style}
        />
      </div>
    {/if}

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
              <button
                class="btn-ghost chip-lib-btn"
                on:click={() => addToLibrary(source)}
                title="Save to reference library"
                type="button"
              >+ lib</button>
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Type-aware ghost placeholder (shown when content is empty) -->
    {#if isEmptyContent && $currentPaperType !== 'research'}
      <div class="ghost-placeholder" aria-hidden="true">
        {ghostPlaceholder}
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

    <!-- Annotated bibliography annotation panes -->
    {#if $currentPaperType === 'annotated_bibliography' && $sources.length > 0}
      <div class="annotations-panel">
        <h3 class="annotations-heading">Annotations</h3>
        <p class="annotations-subheading">Write a 150-word annotation for each source below.</p>
        {#each $sources as source (source.id)}
          {@const annotationText = annotations[source.id] ?? ''}
          {@const wc = wordCount(annotationText)}
          <div class="annotation-entry">
            <div class="annotation-source-title">
              {source.fields.title ?? 'Untitled source'}
              {#if source.fields.authors}
                <span class="annotation-author">
                  — {source.fields.authors.split(';')[0].trim()}
                  {#if source.fields.year}({source.fields.year}){/if}
                </span>
              {/if}
            </div>
            <textarea
              class="annotation-textarea {annotationClass(annotationText)}"
              rows="5"
              placeholder="Summarize, assess, and reflect on this source (150 words)..."
              value={annotationText}
              on:input={(e) => handleAnnotationInput(source.id, getAnnotationValue(e))}
              aria-label="Annotation for {source.fields.title ?? 'this source'}"
            ></textarea>
            <div
              class="annotation-wordcount"
              class:annotation-wordcount--warn={wc > 175 || (wc < 100 && wc > 0)}
            >
              {wc} / 150 words
              {#if wc > 175}
                · over limit
              {:else if wc < 100 && wc > 0}
                · too short
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="error-state">
      <p>Paper not found.</p>
      <button class="btn-secondary" on:click={() => goto(base || '/')} type="button">
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

  /* Paper type bar */
  .paper-type-bar {
    display: flex;
    align-items: center;
    padding: var(--space-1) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .paper-type-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 2px var(--space-2);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .paper-type-btn:hover {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .paper-type-btn-label {
    font-family: var(--font-ui);
  }

  .paper-type-btn-caret {
    font-size: 0.6rem;
    opacity: 0.6;
  }

  /* Popover overlay */
  .type-picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: transparent;
  }

  .type-picker-popover {
    position: absolute;
    top: calc(var(--toolbar-height, 36px) + 60px);
    left: var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl, 0 8px 32px rgba(0, 0, 0, 0.18));
    min-width: 320px;
    z-index: 51;
    overflow: hidden;
  }

  /* Formatting tip */
  .tip-wrapper {
    padding: var(--space-2) var(--space-4);
    flex-shrink: 0;
  }

  /* Ghost placeholder */
  .ghost-placeholder {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
    flex-shrink: 0;
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

  .chip-lib-btn {
    display: inline-flex;
    align-items: center;
    padding: 1px var(--space-2);
    background: var(--color-surface-2);
    border: none;
    border-left: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s, color 0.1s;
    font-family: var(--font-ui);
  }

  .chip-lib-btn:hover {
    background: var(--color-surface-3, var(--color-surface-2));
    color: var(--color-text);
  }

  /* Editor */
  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Annotated bibliography annotations panel */
  .annotations-panel {
    border-top: 2px solid var(--color-border);
    padding: var(--space-4);
    background: var(--color-surface);
    overflow-y: auto;
    max-height: 40vh;
    flex-shrink: 0;
  }

  .annotations-heading {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  .annotations-subheading {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .annotation-entry {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .annotation-source-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text);
  }

  .annotation-author {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .annotation-textarea {
    width: 100%;
    resize: vertical;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-bg);
    transition: border-color 0.15s;
  }

  .annotation-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .annotation-textarea.annotation--warn {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  .annotation-wordcount {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: right;
  }

  .annotation-wordcount--warn {
    color: #b45309;
    font-weight: 600;
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
