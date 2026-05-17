<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { PaperListItem, CitationStyle } from '@perrla-free/core';
  import { paperList, createPaper, removePaper, notify, activePaperId } from '../store.js';
  import { importFromFile } from '../storage.js';

  const dispatch = createEventDispatcher<{ paperCreated: string }>();

  let isCreating = false;
  let newTitle = '';
  let newStyle: CitationStyle = 'apa7';
  let showCreateForm = false;
  let fileInput: HTMLInputElement;

  const styleLabels: Record<CitationStyle, string> = {
    apa7: 'APA 7',
    mla9: 'MLA 9',
    chicago: 'Chicago',
    ieee: 'IEEE',
  };

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function handleCreate() {
    if (!newTitle.trim()) {
      notify('Enter a paper title', 'error');
      return;
    }
    isCreating = true;
    try {
      const paper = await createPaper(newTitle.trim(), newStyle);
      newTitle = '';
      showCreateForm = false;
      await goto(`${base}/paper/${paper.id}`);
    } catch (err) {
      notify(`Could not create paper: ${err}`, 'error');
    } finally {
      isCreating = false;
    }
  }

  async function handleDelete(item: PaperListItem) {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await removePaper(item.id);
      notify('Paper deleted', 'info');
    } catch (err) {
      notify(`Could not delete: ${err}`, 'error');
    }
  }

  async function handleImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const paper = await importFromFile(file);
      notify(`Imported "${paper.title}"`, 'success');
      await goto(`${base}/paper/${paper.id}`);
    } catch (err) {
      notify(`Import failed: ${err}`, 'error');
    } finally {
      input.value = '';
    }
  }

  function openPaper(id: string) {
    goto(`${base}/paper/${id}`);
  }
</script>

<div class="paper-list-panel">
  <!-- Actions bar -->
  <div class="list-actions">
    <button
      class="btn-primary new-btn"
      on:click={() => showCreateForm = !showCreateForm}
      type="button"
    >
      + New Paper
    </button>
    <button
      class="btn-secondary import-btn"
      on:click={() => fileInput.click()}
      title="Import a .perrla file"
      type="button"
    >
      Import
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".perrla,application/json"
      on:change={handleImport}
      style="display:none"
      aria-hidden="true"
    />
  </div>

  <!-- Create form -->
  {#if showCreateForm}
    <div class="create-form">
      <div class="field">
        <label for="new-title">Paper Title</label>
        <input
          id="new-title"
          type="text"
          bind:value={newTitle}
          placeholder="My Research Paper"
          on:keydown={(e) => e.key === 'Enter' && handleCreate()}
          autofocus
        />
      </div>
      <div class="field">
        <label for="new-style">Citation Style</label>
        <select id="new-style" bind:value={newStyle}>
          <option value="apa7">APA 7th Edition</option>
          <option value="mla9">MLA 9th Edition</option>
          <option value="chicago">Chicago 17th</option>
          <option value="ieee">IEEE</option>
        </select>
      </div>
      <div class="create-form-actions">
        <button class="btn-secondary" on:click={() => showCreateForm = false} type="button">Cancel</button>
        <button class="btn-primary" on:click={handleCreate} disabled={isCreating} type="button">
          {isCreating ? 'Creating...' : 'Create Paper'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Paper list -->
  {#if $paperList.length === 0}
    <div class="list-empty">
      <p>No papers yet.</p>
      <p class="list-empty-hint">Create your first paper above.</p>
    </div>
  {:else}
    <div class="papers">
      {#each $paperList as paper (paper.id)}
        <div
          class="paper-item"
          class:active={$activePaperId === paper.id}
          role="button"
          tabindex="0"
          on:click={() => openPaper(paper.id)}
          on:keydown={(e) => e.key === 'Enter' && openPaper(paper.id)}
          aria-label="Open {paper.title}"
        >
          <div class="paper-info">
            <p class="paper-title truncate">{paper.title}</p>
            <p class="paper-meta">
              <span class="paper-style">{styleLabels[paper.style]}</span>
              <span class="paper-sep">·</span>
              <span>{paper.sourceCount} source{paper.sourceCount !== 1 ? 's' : ''}</span>
              <span class="paper-sep">·</span>
              <span>{formatDate(paper.updatedAt)}</span>
            </p>
          </div>
          <button
            class="paper-delete btn-ghost"
            on:click|stopPropagation={() => handleDelete(paper)}
            title="Delete paper"
            type="button"
            aria-label="Delete {paper.title}"
          >✕</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .paper-list-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    overflow: hidden;
    height: 100%;
  }

  .list-actions {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-3);
    flex-shrink: 0;
  }

  .new-btn { flex: 1; }

  .create-form {
    padding: 0 var(--space-3) var(--space-3);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .create-form-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    margin-top: var(--space-2);
  }

  .list-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .list-empty-hint {
    margin-top: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .papers {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-2) var(--space-2);
  }

  .paper-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.1s;
    user-select: none;
  }

  .paper-item:hover {
    background: var(--color-surface-2);
  }

  .paper-item.active {
    background: var(--color-accent-light);
  }

  .paper-info {
    flex: 1;
    min-width: 0;
  }

  .paper-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .paper-item.active .paper-title {
    color: var(--color-accent);
  }

  .paper-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: 1px;
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }

  .paper-style {
    background: var(--color-surface-2);
    padding: 0 4px;
    border-radius: 2px;
    font-weight: 500;
  }

  .paper-sep {
    color: var(--color-border-strong);
  }

  .paper-delete {
    opacity: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-xs);
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  .paper-item:hover .paper-delete {
    opacity: 1;
  }

  .paper-delete:hover {
    background: var(--color-danger-light);
    color: var(--color-danger);
  }
</style>
