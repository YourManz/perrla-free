<script lang="ts">
  import type { CitationStyle } from '@perrla-free/core';
  import { currentStyle, updateStyle, notify } from '../store.js';

  const styles: { value: CitationStyle; label: string; description: string }[] = [
    {
      value: 'apa7',
      label: 'APA 7th',
      description: 'American Psychological Association — psychology, education, social sciences',
    },
    {
      value: 'mla9',
      label: 'MLA 9th',
      description: 'Modern Language Association — humanities, literature, language',
    },
    {
      value: 'chicago',
      label: 'Chicago 17th',
      description: 'Chicago Manual of Style — history, arts, social sciences',
    },
    {
      value: 'ieee',
      label: 'IEEE',
      description: 'Institute of Electrical and Electronics Engineers — engineering, computer science',
    },
    {
      value: 'turabian',
      label: 'Turabian 9th',
      description: 'Chicago-based — history, arts, humanities',
    },
  ];

  let isChanging = false;

  async function selectStyle(style: CitationStyle) {
    if (style === $currentStyle) return;
    isChanging = true;
    try {
      await updateStyle(style);
      notify(`Switched to ${styles.find(s => s.value === style)?.label ?? style}`, 'success');
    } catch (err) {
      notify(`Failed to update style: ${err}`, 'error');
    } finally {
      isChanging = false;
    }
  }
</script>

<div class="style-selector">
  <h3 class="section-label">Citation Style</h3>

  <div class="style-list">
    {#each styles as style}
      <button
        class="style-option"
        class:active={$currentStyle === style.value}
        on:click={() => selectStyle(style.value)}
        disabled={isChanging}
        type="button"
        title={style.description}
      >
        <span class="style-name">{style.label}</span>
        <span class="style-desc">{style.description}</span>
        {#if $currentStyle === style.value}
          <span class="style-check" aria-hidden="true">✓</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .style-selector {
    padding: var(--space-3) var(--space-3);
  }

  .section-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-2);
  }

  .style-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    position: relative;
    transition: background 0.1s, border-color 0.1s;
  }

  .style-option:hover:not(:disabled) {
    background: var(--color-surface-2);
  }

  .style-option.active {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
  }

  .style-option:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .style-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .style-option.active .style-name {
    color: var(--color-accent);
  }

  .style-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: 1px;
    line-height: 1.3;
  }

  .style-check {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-accent);
    font-size: var(--font-size-sm);
    font-weight: bold;
  }
</style>
