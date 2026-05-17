<script lang="ts">
  import type { CitationStyle } from '@perrla-free/core';
  import { updateAbstract } from '../store.js';

  /** The paper's current citation style */
  export let style: CitationStyle;
  /** The current abstract text */
  export let abstract: string = '';

  const ABSTRACT_STYLES: CitationStyle[] = ['apa7', 'chicago'];

  let collapsed = false;
  let localText = abstract;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  $: wordCount = localText.trim() === '' ? 0 : localText.trim().split(/\s+/).length;

  $: wordCountClass =
    wordCount >= 150 && wordCount <= 250
      ? 'wc-good'
      : wordCount < 100 || wordCount > 350
        ? 'wc-warn'
        : 'wc-neutral';

  function handleInput(e: Event) {
    localText = (e.target as HTMLTextAreaElement).value;
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateAbstract(localText);
    }, 600);
  }

  function toggleCollapse() {
    collapsed = !collapsed;
  }

  $: requiresAbstract = ABSTRACT_STYLES.includes(style);
</script>

<div class="abstract-editor">
  <div class="abstract-header">
    <span class="section-label">Abstract</span>
    <button
      class="collapse-btn"
      type="button"
      on:click={toggleCollapse}
      title={collapsed ? 'Expand abstract' : 'Collapse abstract'}
      aria-expanded={!collapsed}
    >
      {collapsed ? '▸' : '▾'}
    </button>
  </div>

  {#if !collapsed}
    {#if requiresAbstract}
      <textarea
        class="abstract-textarea"
        placeholder="Write a concise summary of your paper (150–250 words for APA)..."
        value={localText}
        on:input={handleInput}
        rows={6}
        aria-label="Abstract"
      ></textarea>
      <div class="word-count {wordCountClass}" aria-live="polite">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
    {:else}
      <p class="no-abstract-note">
        {style === 'mla9'
          ? 'MLA papers typically don\'t include an abstract.'
          : style === 'ieee'
            ? 'IEEE papers use an abstract in the paper header — add it directly in the editor.'
            : 'Turabian papers typically don\'t include an abstract.'}
      </p>
    {/if}
  {/if}
</div>

<style>
  .abstract-editor {
    padding: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .abstract-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .section-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .collapse-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: 0 var(--space-1);
    line-height: 1;
    border-radius: var(--radius-sm);
    transition: color 0.1s, background 0.1s;
  }

  .collapse-btn:hover {
    color: var(--color-text);
    background: var(--color-surface-2);
  }

  .abstract-textarea {
    width: 100%;
    resize: vertical;
    font-family: var(--font-family-sans, inherit);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-surface-1, var(--color-surface));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .abstract-textarea:focus {
    border-color: var(--color-accent);
  }

  .word-count {
    margin-top: var(--space-1);
    font-size: var(--font-size-xs);
    text-align: right;
  }

  .wc-good {
    color: var(--color-success, #22c55e);
  }

  .wc-warn {
    color: var(--color-warning, #f97316);
  }

  .wc-neutral {
    color: var(--color-text-muted);
  }

  .no-abstract-note {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-style: italic;
    line-height: 1.4;
  }
</style>
