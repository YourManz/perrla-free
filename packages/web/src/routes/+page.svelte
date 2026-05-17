<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { paperList, createPaper, notify } from '$lib/store.js';

  let isCreating = false;

  async function quickStart() {
    isCreating = true;
    try {
      const paper = await createPaper('Untitled Paper', 'apa7');
      await goto(`${base}/paper/${paper.id}`);
    } catch (err) {
      notify(`Could not create paper: ${err}`, 'error');
      isCreating = false;
    }
  }
</script>

<svelte:head>
  <title>perrla-free — Academic Paper Formatter</title>
</svelte:head>

<div class="home">
  {#if $paperList.length === 0}
    <!-- Landing / first-run screen -->
    <div class="welcome">
      <div class="welcome-content">
        <div class="welcome-logo">pf</div>
        <h1 class="welcome-title">perrla-free</h1>
        <p class="welcome-subtitle">Free, open-source academic paper formatter.</p>
        <p class="welcome-description">
          Write academic papers with proper formatting — margins, double-spacing, hanging indents.
          Add citations in APA, MLA, Chicago, or IEEE. Export to DOCX, PDF, or Markdown.
          Everything is stored locally on your device.
        </p>

        <div class="welcome-features">
          <div class="feature">
            <span class="feature-icon">✍</span>
            <span>Rich text editor with page simulation</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📚</span>
            <span>APA 7th, MLA 9th, Chicago 17th, IEEE citations</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📤</span>
            <span>Export to DOCX, PDF, and Markdown</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🔒</span>
            <span>100% local — no account, no server, no tracking</span>
          </div>
        </div>

        <button
          class="btn-primary welcome-cta"
          on:click={quickStart}
          disabled={isCreating}
          type="button"
        >
          {isCreating ? 'Creating...' : 'Create your first paper'}
        </button>

        <p class="welcome-hint">
          Or select a paper from the sidebar to open it.
        </p>
      </div>
    </div>
  {:else}
    <!-- User has papers — show quick access -->
    <div class="recent-view">
      <h1 class="recent-title">Your Papers</h1>
      <p class="recent-hint">Select a paper from the left sidebar to open it.</p>

      <div class="quick-actions">
        <button
          class="btn-primary"
          on:click={quickStart}
          disabled={isCreating}
          type="button"
        >
          {isCreating ? 'Creating...' : '+ New Paper'}
        </button>
      </div>

      <div class="recent-list">
        <h2 class="recent-list-title">Recent</h2>
        {#each $paperList.slice(0, 5) as paper (paper.id)}
          <a class="recent-item" href="{base}/paper/{paper.id}">
            <div class="recent-item-title">{paper.title}</div>
            <div class="recent-item-meta">
              {paper.style.toUpperCase()} · {paper.sourceCount} sources ·
              {new Date(paper.updatedAt).toLocaleDateString()}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .home {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: stretch;
  }

  /* Welcome screen */
  .welcome {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
  }

  .welcome-content {
    max-width: 540px;
    text-align: center;
  }

  .welcome-logo {
    width: 64px;
    height: 64px;
    background: var(--color-accent);
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-4);
    letter-spacing: -1px;
  }

  .welcome-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .welcome-subtitle {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-4);
  }

  .welcome-description {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-bottom: var(--space-6);
  }

  .welcome-features {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
    text-align: left;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .feature-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .welcome-cta {
    width: 100%;
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-md);
    font-weight: 600;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);
  }

  .welcome-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* Recent papers view */
  .recent-view {
    flex: 1;
    padding: var(--space-8);
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  }

  .recent-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: var(--space-2);
  }

  .recent-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-5);
  }

  .quick-actions {
    margin-bottom: var(--space-6);
  }

  .recent-list-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-3);
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .recent-item {
    display: block;
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: border-color 0.1s, box-shadow 0.1s;
  }

  .recent-item:hover {
    border-color: var(--color-accent);
    box-shadow: var(--shadow-sm);
  }

  .recent-item-title {
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 2px;
  }

  .recent-item-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
</style>
