<script lang="ts">
  import { onMount } from 'svelte';

  export let message: string;
  export let style: 'info' | 'warning' = 'info';
  /** Unique ID used to persist dismissal in localStorage */
  export let tipId: string;

  let dismissed = false;

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      dismissed = localStorage.getItem(`perrla-tip-dismissed:${tipId}`) === '1';
    }
  });

  function dismiss() {
    dismissed = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`perrla-tip-dismissed:${tipId}`, '1');
    }
  }
</script>

{#if !dismissed}
  <div class="formatting-tip" class:info={style === 'info'} class:warning={style === 'warning'} role="note">
    <span class="tip-icon" aria-hidden="true">{style === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span class="tip-message">{message}</span>
    <button class="tip-dismiss" on:click={dismiss} type="button" aria-label="Dismiss tip">×</button>
  </div>
{/if}

<style>
  .formatting-tip {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    line-height: 1.4;
    position: relative;
  }

  .formatting-tip.info {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
  }

  .formatting-tip.warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
  }

  .tip-icon {
    flex-shrink: 0;
    font-size: 0.875rem;
    margin-top: 1px;
  }

  .tip-message {
    flex: 1;
    min-width: 0;
  }

  .tip-dismiss {
    flex-shrink: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
    color: inherit;
    opacity: 0.6;
    transition: opacity 0.1s;
    margin-top: -1px;
  }

  .tip-dismiss:hover {
    opacity: 1;
  }
</style>
