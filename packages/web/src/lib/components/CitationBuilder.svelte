<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { Source, SourceType } from '@perrla-free/core';
  import { upsertSource, removeSource, notify, editingSourceId, activePaper } from '../store.js';
  import { lookupDOI, lookupISBN, lookupURL } from '../lookup.js';

  export let source: Source | null = null; // null = new source

  const dispatch = createEventDispatcher<{ close: void; saved: Source }>();

  type FieldDef = { key: string; label: string; placeholder?: string; required?: boolean; help?: string };

  const sourceTypeOptions: { value: SourceType; label: string }[] = [
    { value: 'journal', label: 'Journal Article' },
    { value: 'book', label: 'Book' },
    { value: 'website', label: 'Website / Webpage' },
    { value: 'conference', label: 'Conference Paper' },
    { value: 'thesis', label: 'Thesis / Dissertation' },
    { value: 'article', label: 'Magazine Article' },
    { value: 'newspaper', label: 'Newspaper Article' },
    { value: 'report', label: 'Government / Org Report' },
    { value: 'film', label: 'Film / Video' },
    { value: 'podcast', label: 'Podcast Episode' },
    { value: 'social_media', label: 'Social Media Post' },
    { value: 'other', label: 'Other' },
  ];

  const fieldsByType: Record<SourceType, FieldDef[]> = {
    journal: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First; Last, First', required: true, help: 'Separate multiple authors with semicolons' },
      { key: 'title', label: 'Article Title', required: true },
      { key: 'journalTitle', label: 'Journal Name', required: true },
      { key: 'year', label: 'Year', placeholder: '2024', required: true },
      { key: 'volume', label: 'Volume' },
      { key: 'issue', label: 'Issue' },
      { key: 'pages', label: 'Pages', placeholder: '123–145' },
      { key: 'doi', label: 'DOI', placeholder: '10.xxxx/xxxxx' },
      { key: 'url', label: 'URL' },
    ],
    book: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First; Last, First', required: true },
      { key: 'editors', label: 'Editor(s)', placeholder: 'Last, First (if edited volume)' },
      { key: 'title', label: 'Book Title', required: true },
      { key: 'edition', label: 'Edition', placeholder: '3rd' },
      { key: 'publisher', label: 'Publisher', required: true },
      { key: 'publisherPlace', label: 'Publisher City' },
      { key: 'year', label: 'Year', required: true },
      { key: 'isbn', label: 'ISBN' },
    ],
    website: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First or Organization Name' },
      { key: 'title', label: 'Page Title', required: true },
      { key: 'journalTitle', label: 'Website Name' },
      { key: 'year', label: 'Year Published / Updated' },
      { key: 'month', label: 'Month', placeholder: '3' },
      { key: 'day', label: 'Day', placeholder: '15' },
      { key: 'url', label: 'URL', required: true },
      { key: 'urlAccessDate', label: 'Date Accessed', placeholder: '2024-03-15' },
    ],
    conference: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First', required: true },
      { key: 'title', label: 'Paper Title', required: true },
      { key: 'conferenceName', label: 'Conference Name', required: true },
      { key: 'conferencePlace', label: 'Conference Location' },
      { key: 'year', label: 'Year', required: true },
      { key: 'pages', label: 'Pages' },
      { key: 'doi', label: 'DOI' },
      { key: 'url', label: 'URL' },
    ],
    thesis: [
      { key: 'authors', label: 'Author', placeholder: 'Last, First', required: true },
      { key: 'title', label: 'Thesis Title', required: true },
      { key: 'thesisType', label: 'Thesis Type', placeholder: 'Doctoral dissertation' },
      { key: 'institution', label: 'Institution', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'url', label: 'URL or Database' },
    ],
    article: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First', required: true },
      { key: 'title', label: 'Article Title', required: true },
      { key: 'journalTitle', label: 'Publication Name', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'month', label: 'Month', placeholder: '3' },
      { key: 'day', label: 'Day', placeholder: '15' },
      { key: 'pages', label: 'Pages' },
      { key: 'url', label: 'URL' },
    ],
    newspaper: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First', required: true },
      { key: 'title', label: 'Article Title', required: true },
      { key: 'journalTitle', label: 'Newspaper Name', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'month', label: 'Month', placeholder: '3' },
      { key: 'day', label: 'Day', placeholder: '15' },
      { key: 'pages', label: 'Pages / Section', placeholder: 'A1' },
      { key: 'url', label: 'URL (online edition)' },
    ],
    report: [
      { key: 'authors', label: 'Author(s) or Organization', placeholder: 'Last, First or Org Name', required: true },
      { key: 'title', label: 'Report Title', required: true },
      { key: 'publisher', label: 'Publishing Organization', required: true },
      { key: 'publisherPlace', label: 'City / Location' },
      { key: 'year', label: 'Year', required: true },
      { key: 'note', label: 'Report Number / Series', placeholder: 'Report No. 2024-01' },
      { key: 'url', label: 'URL' },
    ],
    film: [
      { key: 'authors', label: 'Director(s)', placeholder: 'Last, First (Director)', required: true },
      { key: 'title', label: 'Film Title', required: true },
      { key: 'publisher', label: 'Studio / Distributor', required: true },
      { key: 'year', label: 'Year Released', required: true },
      { key: 'note', label: 'Medium', placeholder: 'Film, DVD, Streaming' },
      { key: 'url', label: 'URL (streaming link)' },
    ],
    podcast: [
      { key: 'authors', label: 'Host(s)', placeholder: 'Last, First', required: true },
      { key: 'title', label: 'Episode Title', required: true },
      { key: 'journalTitle', label: 'Podcast Name', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'month', label: 'Month', placeholder: '3' },
      { key: 'day', label: 'Day', placeholder: '15' },
      { key: 'note', label: 'Episode Number', placeholder: 'Ep. 42' },
      { key: 'url', label: 'URL', required: true },
      { key: 'urlAccessDate', label: 'Date Accessed', placeholder: '2024-03-15' },
    ],
    social_media: [
      { key: 'authors', label: 'Account / Author', placeholder: 'Last, First or @handle', required: true },
      { key: 'title', label: 'Post Content (first 20 words)', required: true },
      { key: 'journalTitle', label: 'Platform', placeholder: 'Twitter, Facebook, Instagram', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'month', label: 'Month', placeholder: '3' },
      { key: 'day', label: 'Day', placeholder: '15' },
      { key: 'url', label: 'Post URL', required: true },
      { key: 'urlAccessDate', label: 'Date Accessed', placeholder: '2024-03-15' },
    ],
    other: [
      { key: 'authors', label: 'Author(s)', placeholder: 'Last, First' },
      { key: 'title', label: 'Title', required: true },
      { key: 'publisher', label: 'Publisher / Source' },
      { key: 'year', label: 'Year' },
      { key: 'url', label: 'URL' },
      { key: 'note', label: 'Note', placeholder: 'Any additional info for the citation' },
    ],
  };

  // Form state
  let type: SourceType = source?.type ?? 'journal';
  let fields: Record<string, string> = {};
  let isSaving = false;
  let isDeleting = false;

  // Quick-fill state
  let quickFillValue = '';
  let isLookingUp = false;
  let lookupError = '';

  function detectLookupType(value: string): 'doi' | 'isbn' | 'url' | null {
    const v = value.trim();
    if (!v) return null;
    if (v.startsWith('10.') || /^https?:\/\/(dx\.)?doi\.org\//i.test(v)) return 'doi';
    if (v.startsWith('http://') || v.startsWith('https://')) return 'url';
    // ISBN: strip hyphens/spaces and check it looks like a run of digits/X
    const stripped = v.replace(/[-\s]/g, '');
    if (/^\d[\dX]{8,}$/.test(stripped)) return 'isbn';
    return null;
  }

  async function handleLookup() {
    const v = quickFillValue.trim();
    if (!v) return;

    const kind = detectLookupType(v);
    if (!kind) {
      lookupError = 'Enter a DOI (10.xxx/…), ISBN, or URL';
      return;
    }

    isLookingUp = true;
    lookupError = '';

    try {
      let result: Partial<import('@perrla-free/core').SourceFields>;
      let label: string;

      if (kind === 'doi') {
        result = await lookupDOI(v);
        label = 'DOI';
        type = 'journal';
      } else if (kind === 'isbn') {
        result = await lookupISBN(v);
        label = 'ISBN';
        type = 'book';
        // Clear fields when switching type to avoid stale fields
        fields = {};
      } else {
        result = await lookupURL(v);
        label = 'URL';
      }

      // Merge: only fill fields the user hasn't already typed
      const merged: Record<string, string> = { ...fields };
      for (const [key, val] of Object.entries(result)) {
        if (val !== undefined && !merged[key]?.trim()) {
          merged[key] = val;
        }
      }
      fields = merged;
      await tick();
      notify(`Fields filled from ${label}`, 'success');
    } catch (err) {
      lookupError = err instanceof Error ? err.message : String(err);
    } finally {
      isLookingUp = false;
    }
  }

  function handleLookupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleLookup();
  }

  // Initialize from existing source (only runs when editing; new source starts with empty fields)
  $: if (source) {
    type = source.type;
    fields = { ...source.fields } as Record<string, string>;
  }

  $: currentFields = fieldsByType[type] ?? fieldsByType.other;

  function validateForm(): string | null {
    for (const f of currentFields) {
      if (f.required && !(fields[f.key] ?? '').trim()) {
        return `${f.label} is required`;
      }
    }
    return null;
  }

  async function handleSave() {
    const error = validateForm();
    if (error) {
      notify(error, 'error');
      return;
    }

    isSaving = true;
    try {
      const saved = await upsertSource(fields, type, source?.id);
      notify(`Source ${source ? 'updated' : 'added'} successfully`, 'success');
      dispatch('saved', saved);
      dispatch('close');
    } catch (err) {
      notify(`Failed to save source: ${err}`, 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete() {
    if (!source) return;
    if (!confirm('Remove this source? Any in-text citations to it will remain in the document.')) return;

    isDeleting = true;
    try {
      await removeSource(source.id);
      notify('Source removed', 'info');
      dispatch('close');
    } catch (err) {
      notify(`Failed to remove: ${err}`, 'error');
    } finally {
      isDeleting = false;
    }
  }
</script>

<div class="citation-builder">
  <div class="builder-header">
    <h2 class="builder-title">{source ? 'Edit Source' : 'Add Source'}</h2>
    <button class="btn-ghost close-btn" on:click={() => dispatch('close')} type="button" aria-label="Close">✕</button>
  </div>

  <div class="builder-body">
    <!-- Quick fill row -->
    <div class="quick-fill">
      <label class="quick-fill-label" for="quick-fill-input">Quick fill</label>
      <div class="quick-fill-row">
        <input
          id="quick-fill-input"
          class="quick-fill-input"
          type="text"
          placeholder="DOI, ISBN, or URL"
          bind:value={quickFillValue}
          on:keydown={handleLookupKeydown}
          disabled={isLookingUp}
          aria-label="DOI, ISBN, or URL for autofill"
        />
        <button
          class="btn-accent quick-fill-btn"
          on:click={handleLookup}
          disabled={isLookingUp || !quickFillValue.trim()}
          type="button"
          aria-label="Look up metadata"
        >
          {#if isLookingUp}
            <span class="spinner" aria-hidden="true"></span>
            <span>Looking up…</span>
          {:else}
            Look up
          {/if}
        </button>
      </div>
      {#if lookupError}
        <p class="quick-fill-error" role="alert">{lookupError}</p>
      {/if}
    </div>

    <!-- Source type selector -->
    <div class="field">
      <label for="source-type">Source Type</label>
      <select
        id="source-type"
        bind:value={type}
        on:change={() => { fields = {}; }}
      >
        {#each sourceTypeOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <!-- Dynamic fields -->
    {#each currentFields as fieldDef}
      <div class="field">
        <label for="field-{fieldDef.key}">
          {fieldDef.label}
          {#if fieldDef.required}<span class="required">*</span>{/if}
        </label>
        <input
          id="field-{fieldDef.key}"
          type="text"
          bind:value={fields[fieldDef.key]}
          placeholder={fieldDef.placeholder ?? ''}
          aria-label={fieldDef.label}
        />
        {#if fieldDef.help}
          <p class="field-help">{fieldDef.help}</p>
        {/if}
      </div>
    {/each}

    <!-- APA format hint -->
    <div class="format-hint">
      <p>Authors: use <code>Last, First</code> format. Separate multiple authors with semicolons.</p>
    </div>
  </div>

  <div class="builder-footer">
    {#if source}
      <button
        class="btn-danger"
        on:click={handleDelete}
        disabled={isDeleting}
        type="button"
      >
        {isDeleting ? 'Removing...' : 'Remove'}
      </button>
    {:else}
      <div></div>
    {/if}

    <div class="footer-actions">
      <button class="btn-secondary" on:click={() => dispatch('close')} type="button">Cancel</button>
      <button
        class="btn-primary"
        on:click={handleSave}
        disabled={isSaving}
        type="button"
      >
        {isSaving ? 'Saving...' : (source ? 'Update Source' : 'Add Source')}
      </button>
    </div>
  </div>
</div>

<style>
  .citation-builder {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .builder-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .builder-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .close-btn {
    font-size: var(--font-size-md);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .builder-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .field {
    margin-bottom: var(--space-3);
  }

  .required {
    color: var(--color-danger);
    margin-left: 2px;
  }

  .field-help {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .format-hint {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    margin-top: var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .format-hint p { margin: 0; }

  code {
    font-family: var(--font-mono);
    background: var(--color-border);
    border-radius: 2px;
    padding: 0 3px;
  }

  .builder-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .footer-actions {
    display: flex;
    gap: var(--space-2);
  }

  /* Quick fill */
  .quick-fill {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .quick-fill-label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .quick-fill-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .quick-fill-input {
    flex: 1;
    min-width: 0;
  }

  .btn-accent {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-3);
    height: 34px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
  }

  .btn-accent:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-accent:not(:disabled):hover {
    opacity: 0.88;
  }

  .quick-fill-btn {
    flex-shrink: 0;
  }

  .quick-fill-error {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-danger);
  }

  /* Spinner */
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
