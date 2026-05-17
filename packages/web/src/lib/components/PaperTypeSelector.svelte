<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PaperType } from '@perrla-free/core';
  import { currentPaperType, setPaperType, notify } from '../store.js';

  const dispatch = createEventDispatcher<{ typechange: PaperType }>();

  interface PaperTypeOption {
    value: PaperType;
    icon: string;
    label: string;
    description: string;
  }

  const paperTypes: PaperTypeOption[] = [
    {
      value: 'research',
      icon: '📄',
      label: 'Research Paper',
      description: 'Full academic paper with intro, body, conclusion, and references',
    },
    {
      value: 'discussion',
      icon: '💬',
      label: 'Discussion Post',
      description: 'Short response post (250–500 words) with in-text citations',
    },
    {
      value: 'reference_list',
      icon: '📚',
      label: 'Reference List',
      description: 'References page only — no body text required',
    },
    {
      value: 'annotated_bibliography',
      icon: '📝',
      label: 'Annotated Bibliography',
      description: 'References with a 150-word annotation after each entry',
    },
  ];

  let isChanging = false;

  async function selectType(type: PaperType) {
    if (type === $currentPaperType || isChanging) return;
    isChanging = true;
    try {
      await setPaperType(type);
      const label = paperTypes.find((t) => t.value === type)?.label ?? type;
      notify(`Switched to ${label} format`, 'success');
      dispatch('typechange', type);
    } catch (err) {
      notify(`Failed to update paper type: ${err}`, 'error');
    } finally {
      isChanging = false;
    }
  }
</script>

<div class="paper-type-selector">
  <h3 class="section-label">Paper Type</h3>
  <div class="type-grid">
    {#each paperTypes as pt (pt.value)}
      <button
        class="type-card"
        class:active={$currentPaperType === pt.value}
        on:click={() => selectType(pt.value)}
        disabled={isChanging}
        type="button"
        title={pt.description}
      >
        <span class="type-icon" aria-hidden="true">{pt.icon}</span>
        <span class="type-body">
          <span class="type-label">{pt.label}</span>
          <span class="type-desc">{pt.description}</span>
        </span>
        {#if $currentPaperType === pt.value}
          <span class="type-check" aria-hidden="true">✓</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .paper-type-selector {
    padding: var(--space-3);
  }

  .section-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-2);
  }

  .type-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .type-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
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

  .type-card:hover:not(:disabled) {
    background: var(--color-surface-2);
  }

  .type-card.active {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
  }

  .type-card:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .type-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    line-height: 1;
  }

  .type-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .type-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
  }

  .type-card.active .type-label {
    color: var(--color-accent);
  }

  .type-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.3;
    white-space: normal;
  }

  .type-check {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-accent);
    font-size: var(--font-size-sm);
    font-weight: bold;
    flex-shrink: 0;
  }
</style>
