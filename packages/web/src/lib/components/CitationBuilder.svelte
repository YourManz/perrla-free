<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Source, SourceType } from '@perrla-free/core';
  import { upsertSource, removeSource, notify, editingSourceId, activePaper } from '../store.js';

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

  // Initialize from existing source
  $: {
    if (source) {
      type = source.type;
      fields = { ...source.fields } as Record<string, string>;
    } else {
      fields = {};
    }
  }

  $: currentFields = fieldsByType[type] ?? fieldsByType.other;

  function getField(key: string): string {
    return fields[key] ?? '';
  }

  function setField(key: string, value: string) {
    fields = { ...fields, [key]: value };
  }

  function validateForm(): string | null {
    for (const f of currentFields) {
      if (f.required && !getField(f.key).trim()) {
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
          value={getField(fieldDef.key)}
          on:input={(e) => setField(fieldDef.key, e.currentTarget.value)}
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
</style>
