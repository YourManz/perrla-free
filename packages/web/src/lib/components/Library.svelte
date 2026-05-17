<script lang="ts">
  import type { Source } from '@perrla-free/core';
  import {
    libraryStore,
    addToLibrary,
    removeLibrarySource,
    importLibrarySource,
    refreshLibrary,
    notify,
  } from '$lib/store.js';
  import { saveToLibrary } from '$lib/storage.js';

  export let currentPaperId: string | undefined = undefined;

  let searchQuery = '';
  let expandedNoteId: string | null = null;
  let noteValues: Record<string, string> = {};

  // Filter sources by search query
  $: filtered = $libraryStore.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (s.fields.title ?? '').toLowerCase();
    const authors = (s.fields.authors ?? '').toLowerCase();
    const year = (s.fields.year ?? '').toLowerCase();
    return title.includes(q) || authors.includes(q) || year.includes(q);
  });

  function getDisplayTitle(source: Source): string {
    return source.fields.title ?? '(No title)';
  }

  function getAuthorYear(source: Source): string {
    const authors = source.fields.authors ?? '';
    const year = source.fields.year ?? '';
    const parts: string[] = [];
    if (authors) parts.push(authors.split(';')[0].trim());
    if (year) parts.push(year);
    return parts.join(', ');
  }

  function getNotesPreview(source: Source): string {
    if (!source.notes) return '';
    return source.notes.length > 80 ? source.notes.slice(0, 80) + '…' : source.notes;
  }

  function getTypeBadge(source: Source): string {
    return source.type.replace('_', ' ');
  }

  function toggleNote(source: Source) {
    if (expandedNoteId === source.id) {
      expandedNoteId = null;
    } else {
      expandedNoteId = source.id;
      noteValues[source.id] = source.notes ?? '';
    }
  }

  async function saveNote(source: Source) {
    const updated: Source = {
      ...source,
      notes: noteValues[source.id] ?? '',
      updatedAt: Date.now(),
    };
    await saveToLibrary(updated);
    await refreshLibrary();
    expandedNoteId = null;
    notify('Note saved', 'success');
  }

  async function handleAddToPaper(source: Source) {
    if (!currentPaperId) {
      notify('No paper is open', 'error');
      return;
    }
    await importLibrarySource(source.id, currentPaperId);
  }

  async function handleRemove(source: Source) {
    await removeLibrarySource(source.id);
  }
</script>

<div class="library">
  <div class="library-header">
    <input
      class="search-input"
      type="search"
      placeholder="Search library…"
      bind:value={searchQuery}
      aria-label="Search library sources"
    />
  </div>

  {#if $libraryStore.length === 0}
    <div class="empty-state">
      <p>Your library is empty.</p>
      <p>Save sources from any paper to build your collection.</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <p>No sources match your search.</p>
    </div>
  {:else}
    <ul class="source-list" aria-label="Library sources">
      {#each filtered as source (source.id)}
        <li class="source-item">
          <div class="source-main">
            <div class="source-info">
              <span class="source-title">{getDisplayTitle(source)}</span>
              <span class="source-meta">{getAuthorYear(source)}</span>
              <span class="type-badge">{getTypeBadge(source)}</span>
              {#if source.notes && expandedNoteId !== source.id}
                <span class="notes-preview">{getNotesPreview(source)}</span>
              {/if}
            </div>
            <div class="source-actions">
              <button
                class="btn-sm btn-primary"
                type="button"
                on:click={() => handleAddToPaper(source)}
                title="Add to current paper"
                disabled={!currentPaperId}
              >
                Add to paper
              </button>
              <button
                class="btn-sm btn-ghost"
                type="button"
                on:click={() => toggleNote(source)}
                title={expandedNoteId === source.id ? 'Cancel note' : 'Add / edit note'}
              >
                {expandedNoteId === source.id ? 'Cancel' : 'Note'}
              </button>
              <button
                class="btn-sm btn-danger"
                type="button"
                on:click={() => handleRemove(source)}
                title="Remove from library"
              >
                Remove
              </button>
            </div>
          </div>

          {#if expandedNoteId === source.id}
            <div class="note-editor">
              <textarea
                class="note-textarea"
                placeholder="Add research notes…"
                bind:value={noteValues[source.id]}
                rows="4"
                aria-label="Research notes for {getDisplayTitle(source)}"
              ></textarea>
              <button
                class="btn-sm btn-primary"
                type="button"
                on:click={() => saveNote(source)}
              >
                Save note
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .library {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .library-header {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: var(--font-ui);
    background: var(--color-bg);
    color: var(--color-text);
    outline: none;
  }

  .search-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .empty-state {
    padding: var(--space-6) var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .source-list {
    list-style: none;
    overflow-y: auto;
    flex: 1;
  }

  .source-item {
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .source-item:hover {
    background: var(--color-surface-2);
  }

  .source-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .source-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .source-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    word-break: break-word;
  }

  .source-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .type-badge {
    display: inline-block;
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-accent);
    background: var(--color-accent-light);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    text-transform: capitalize;
    width: fit-content;
  }

  .notes-preview {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-style: italic;
    word-break: break-word;
  }

  .source-actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .note-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .note-textarea {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-family: var(--font-ui);
    background: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
    outline: none;
  }

  .note-textarea:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  /* Buttons */
  .btn-sm {
    font-size: var(--font-size-xs);
    padding: 3px var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: 500;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
  }

  .btn-sm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border-color: var(--color-border);
  }

  .btn-ghost:hover:not(:disabled) {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  .btn-danger {
    background: transparent;
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger-light);
  }
</style>
