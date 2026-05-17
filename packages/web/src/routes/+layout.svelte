<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import '../app.css';
  import PaperList from '$lib/components/PaperList.svelte';
  import StyleSelector from '$lib/components/StyleSelector.svelte';
  import CitationBuilder from '$lib/components/CitationBuilder.svelte';
  import ReferenceList from '$lib/components/ReferenceList.svelte';
  import ExportMenu from '$lib/components/ExportMenu.svelte';
  import Library from '$lib/components/Library.svelte';
  import {
    initStore,
    activePaper,
    activePaperId,
    notification,
    activePanel,
    editingSourceId,
    refPanelVisible,
    sources,
    notify,
    updateSettings,
    refreshLibrary,
  } from '$lib/store.js';

  let initialized = false;
  let titleEditValue = '';
  let isTitleEditing = false;

  onMount(async () => {
    await initStore();
    await refreshLibrary();
    initialized = true;
  });

  // Sync title edit value when active paper changes
  $: if ($activePaper) {
    if (!isTitleEditing) {
      titleEditValue = $activePaper.title;
    }
  }

  async function handleTitleBlur() {
    isTitleEditing = false;
    const trimmed = titleEditValue.trim();
    if (trimmed && trimmed !== $activePaper?.title) {
      await updateSettings({ title: trimmed });
    }
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
    } else if (e.key === 'Escape') {
      isTitleEditing = false;
      titleEditValue = $activePaper?.title ?? '';
      (e.target as HTMLElement).blur();
    }
  }

  // Determine if we're in the editor view
  $: inEditor = $page.url.pathname.startsWith('/paper/');

  // Which source is being edited
  $: editingSource = $editingSourceId != null
    ? ($sources.find((s) => s.id === $editingSourceId) ?? null)
    : null;
</script>

<div class="app-shell" class:in-editor={inEditor}>
  <!-- Top bar -->
  <header class="topbar">
    <div class="topbar-left">
      <a href="{base}/" class="app-logo" aria-label="perrla-free home">
        <span class="logo-mark">pf</span>
        <span class="logo-text">perrla-free</span>
      </a>

      {#if inEditor && $activePaper}
        <div class="title-editor">
          <input
            type="text"
            class="title-input"
            bind:value={titleEditValue}
            on:focus={() => isTitleEditing = true}
            on:blur={handleTitleBlur}
            on:keydown={handleTitleKeydown}
            aria-label="Paper title"
            placeholder="Untitled Paper"
          />
        </div>
      {/if}
    </div>

    <div class="topbar-right">
      <a href="{base}/instructions" class="help-link">Help</a>
      {#if inEditor && $activePaper}
        <button
          class="btn-ghost panel-toggle"
          class:active={$activePanel === 'citation-builder'}
          on:click={() => activePanel.set($activePanel === 'citation-builder' ? 'papers' : 'citation-builder')}
          type="button"
          title="Add source"
        >
          + Source
        </button>
        <button
          class="btn-ghost panel-toggle"
          on:click={() => refPanelVisible.update((v) => !v)}
          type="button"
          title="Toggle reference list"
        >
          {$refPanelVisible ? 'Hide Refs' : 'Show Refs'}
        </button>
        <ExportMenu />
      {/if}
    </div>
  </header>

  <!-- Main layout -->
  <div class="layout">
    <!-- Left sidebar -->
    <aside class="sidebar">
      <!-- Tab strip -->
      <div class="sidebar-tabs">
        <button
          class="sidebar-tab"
          class:active={$activePanel === 'papers'}
          on:click={() => activePanel.set('papers')}
          type="button"
        >Papers</button>
        <button
          class="sidebar-tab"
          class:active={$activePanel === 'library'}
          on:click={() => activePanel.set('library')}
          type="button"
        >Library</button>
        {#if inEditor}
          <button
            class="sidebar-tab"
            class:active={$activePanel === 'citation-builder'}
            on:click={() => {
              editingSourceId.set(null);
              activePanel.set('citation-builder');
            }}
            type="button"
          >+ Source</button>
        {/if}
      </div>

      <!-- Panel content -->
      <div class="sidebar-content">
        {#if $activePanel === 'library'}
          <Library currentPaperId={$activePaper?.id} />
        {:else if $activePanel === 'papers' || !inEditor}
          <PaperList />
          {#if inEditor}
            <div class="sidebar-divider"></div>
            <StyleSelector />
          {/if}
        {:else if $activePanel === 'citation-builder'}
          <CitationBuilder
            source={editingSource}
            on:close={() => {
              editingSourceId.set(null);
              activePanel.set('papers');
            }}
            on:saved={() => {
              editingSourceId.set(null);
              activePanel.set('papers');
            }}
          />
        {/if}
      </div>
    </aside>

    <!-- Main content area -->
    <main class="content">
      {#if initialized}
        <slot />
      {:else}
        <div class="loading-screen">
          <p>Loading perrla-free...</p>
        </div>
      {/if}
    </main>

    <!-- Right panel: reference list -->
    {#if inEditor && $refPanelVisible}
      <aside class="ref-sidebar">
        <ReferenceList />
      </aside>
    {/if}
  </div>

  <!-- Notification toast -->
  {#if $notification}
    <div class="toast toast-{$notification.type}" role="status" aria-live="polite">
      {$notification.message}
    </div>
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  /* Top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--topbar-height);
    padding: 0 var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: var(--space-4);
    z-index: 10;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    flex: 1;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .help-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    padding: 0 var(--space-2);
  }

  .help-link:hover {
    color: var(--color-text);
  }

  .app-logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    flex-shrink: 0;
  }

  .logo-mark {
    width: 28px;
    height: 28px;
    background: var(--color-accent);
    color: #fff;
    font-size: var(--font-size-sm);
    font-weight: 700;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: -0.5px;
  }

  .logo-text {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .title-editor {
    flex: 1;
    min-width: 0;
    max-width: 500px;
  }

  .title-input {
    border: 1px solid transparent;
    background: transparent;
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--color-text);
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    width: 100%;
  }

  .title-input:hover {
    border-color: var(--color-border);
  }

  .title-input:focus {
    border-color: var(--color-accent);
    background: var(--color-surface);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .panel-toggle {
    font-size: var(--font-size-sm);
    height: 32px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
  }

  .panel-toggle.active {
    background: var(--color-accent-light);
    color: var(--color-accent);
  }

  /* Layout */
  .layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Left sidebar */
  .sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    overflow: hidden;
  }

  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .sidebar-tab {
    flex: 1;
    padding: var(--space-2) var(--space-2);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
    font-family: var(--font-ui);
  }

  .sidebar-tab:hover {
    color: var(--color-text);
  }

  .sidebar-tab.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .sidebar-divider {
    border-top: 1px solid var(--color-border);
    margin: var(--space-2) 0;
    flex-shrink: 0;
  }

  /* Main content */
  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Right reference panel */
  .ref-sidebar {
    width: var(--ref-panel-width);
    flex-shrink: 0;
    overflow: hidden;
  }

  /* Loading screen */
  .loading-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  /* Toast notifications */
  .toast {
    position: fixed;
    bottom: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-2) var(--space-5);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
    white-space: nowrap;
    pointer-events: none;
    animation: slide-up 0.2s ease-out;
  }

  .toast-success {
    background: #052e16;
    color: #bbf7d0;
    border: 1px solid #16a34a;
  }

  .toast-error {
    background: #450a0a;
    color: #fecaca;
    border: 1px solid #dc2626;
  }

  .toast-info {
    background: #172554;
    color: #bfdbfe;
    border: 1px solid #2563eb;
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
</style>
