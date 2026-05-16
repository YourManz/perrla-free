<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Editor } from '@tiptap/core';
  import type { Paper } from '@perrla-free/core';

  export let paper: Paper;
  export let editor: Editor | null = null;

  const dispatch = createEventDispatcher<{ close: void }>();

  // Pre-fill from paper settings
  let title = paper.settings.title ?? paper.title ?? '';
  let authorName = paper.settings.authorName ?? '';
  let courseName = paper.settings.courseName ?? '';
  let instructorName = paper.settings.instructorName ?? '';
  let institution = paper.settings.institutionName ?? '';
  let dueDate = paper.settings.dueDate ?? '';
  let style: 'apa7' | 'mla9' | 'chicago' | 'ieee' = paper.settings.style ?? 'apa7';

  const styleLabels: Record<string, string> = {
    apa7: 'APA 7th',
    mla9: 'MLA 9th',
    chicago: 'Chicago',
    ieee: 'IEEE',
  };

  // ---- Insert into editor ----

  function buildApaContent() {
    return [
      // 5 blank lines before title
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      // Title (bold, centered)
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: title
          ? [{ type: 'text', marks: [{ type: 'bold' }], text: title }]
          : [],
      },
      // Author
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: authorName ? [{ type: 'text', text: authorName }] : [],
      },
      // Department/Institution
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content:
          institution
            ? [{ type: 'text', text: institution }]
            : [],
      },
      // Course
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: courseName ? [{ type: 'text', text: courseName }] : [],
      },
      // Instructor
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: instructorName ? [{ type: 'text', text: instructorName }] : [],
      },
      // Due date
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: dueDate ? [{ type: 'text', text: dueDate }] : [],
      },
      // Page break separator
      { type: 'paragraph', content: [] },
    ];
  }

  function buildMlaContent() {
    // MLA: top-left corner of page 1 — no separate title page
    return [
      {
        type: 'paragraph',
        content: authorName ? [{ type: 'text', text: authorName }] : [],
      },
      {
        type: 'paragraph',
        content: instructorName ? [{ type: 'text', text: instructorName }] : [],
      },
      {
        type: 'paragraph',
        content: courseName ? [{ type: 'text', text: courseName }] : [],
      },
      {
        type: 'paragraph',
        content: dueDate ? [{ type: 'text', text: dueDate }] : [],
      },
      // Centered title
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: title ? [{ type: 'text', text: title }] : [],
      },
      { type: 'paragraph', content: [] },
    ];
  }

  function buildChicagoContent() {
    // Chicago: separate title page, centered vertically
    return [
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: title
          ? [{ type: 'text', text: title }]
          : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: authorName ? [{ type: 'text', text: authorName }] : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: courseName ? [{ type: 'text', text: courseName }] : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: instructorName ? [{ type: 'text', text: instructorName }] : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: dueDate ? [{ type: 'text', text: dueDate }] : [],
      },
      { type: 'paragraph', content: [] },
    ];
  }

  function buildIeeeContent() {
    // IEEE: centered title + author block
    return [
      { type: 'paragraph', content: [] },
      { type: 'paragraph', content: [] },
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: title
          ? [{ type: 'text', marks: [{ type: 'bold' }], text: title }]
          : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: authorName ? [{ type: 'text', text: authorName }] : [],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: institution ? [{ type: 'text', text: institution }] : [],
      },
      { type: 'paragraph', content: [] },
    ];
  }

  function buildContent() {
    switch (style) {
      case 'apa7': return buildApaContent();
      case 'mla9': return buildMlaContent();
      case 'chicago': return buildChicagoContent();
      case 'ieee': return buildIeeeContent();
      default: return buildApaContent();
    }
  }

  function handleInsert() {
    if (!editor) return;
    const nodes = buildContent();
    // Insert at the very beginning of the document
    editor.chain().focus().setNodeSelection(0).insertContentAt(0, nodes).run();
    dispatch('close');
  }

  function handleDownloadDocx() {
    // Simple text-based DOCX placeholder — a proper DOCX export uses docx.ts
    // For now, build a plain-text version and trigger download
    const lines: string[] = [];
    switch (style) {
      case 'apa7':
        lines.push('', '', '', '', '', title, authorName, institution, courseName, instructorName, dueDate);
        break;
      case 'mla9':
        lines.push(authorName, instructorName, courseName, dueDate, '', title);
        break;
      case 'chicago':
        lines.push('', '', '', title, authorName, courseName, instructorName, dueDate);
        break;
      case 'ieee':
        lines.push('', '', title, authorName, institution);
        break;
    }
    const text = lines.filter((l) => l !== undefined).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'title-page'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="tpg">
  <div class="tpg-header">
    <h2 class="tpg-title">Title Page Generator</h2>
    <button class="btn-ghost close-btn" on:click={() => dispatch('close')} type="button" aria-label="Close">✕</button>
  </div>

  <div class="tpg-body">
    <!-- Style selector -->
    <div class="tpg-row">
      <label for="tpg-style">Style</label>
      <select id="tpg-style" bind:value={style}>
        {#each Object.entries(styleLabels) as [val, lbl]}
          <option value={val}>{lbl}</option>
        {/each}
      </select>
    </div>

    <div class="tpg-columns">
      <!-- Fields -->
      <div class="tpg-fields">
        <div class="field">
          <label for="tpg-title">Paper Title</label>
          <input id="tpg-title" type="text" bind:value={title} placeholder="Your paper title" />
        </div>
        <div class="field">
          <label for="tpg-author">Author Name</label>
          <input id="tpg-author" type="text" bind:value={authorName} placeholder="First Last" />
        </div>
        {#if style !== 'mla9'}
          <div class="field">
            <label for="tpg-inst">Institution</label>
            <input id="tpg-inst" type="text" bind:value={institution} placeholder="University of..." />
          </div>
        {/if}
        <div class="field">
          <label for="tpg-course">Course</label>
          <input id="tpg-course" type="text" bind:value={courseName} placeholder="ENGL 101: Writing" />
        </div>
        <div class="field">
          <label for="tpg-instructor">Instructor</label>
          <input id="tpg-instructor" type="text" bind:value={instructorName} placeholder="Prof. Smith" />
        </div>
        <div class="field">
          <label for="tpg-date">Due Date</label>
          <input id="tpg-date" type="text" bind:value={dueDate} placeholder="May 1, 2026" />
        </div>
      </div>

      <!-- Preview -->
      <div class="tpg-preview" aria-label="Title page preview">
        <p class="preview-label">{styleLabels[style]} preview</p>
        {#if style === 'apa7'}
          <div class="preview-page preview-apa">
            <div style="height: 2.5em;"></div>
            <p class="preview-title-bold">{title || 'Paper Title'}</p>
            <p>{authorName || 'Author Name'}</p>
            <p>{institution || 'Institution'}</p>
            <p>{courseName || 'Course'}</p>
            <p>{instructorName || 'Instructor'}</p>
            <p>{dueDate || 'Due Date'}</p>
          </div>
        {:else if style === 'mla9'}
          <div class="preview-page preview-mla">
            <p class="preview-left">{authorName || 'Author Name'}</p>
            <p class="preview-left">{instructorName || 'Instructor'}</p>
            <p class="preview-left">{courseName || 'Course'}</p>
            <p class="preview-left">{dueDate || 'Due Date'}</p>
            <p class="preview-center" style="margin-top: 0.5em;">{title || 'Paper Title'}</p>
          </div>
        {:else if style === 'chicago'}
          <div class="preview-page preview-chicago">
            <div style="height: 2em;"></div>
            <p class="preview-title">{title || 'Paper Title'}</p>
            <p>{authorName || 'Author Name'}</p>
            <p>{courseName || 'Course'}</p>
            <p>{instructorName || 'Instructor'}</p>
            <p>{dueDate || 'Due Date'}</p>
          </div>
        {:else}
          <div class="preview-page preview-ieee">
            <div style="height: 1.5em;"></div>
            <p class="preview-title-bold">{title || 'Paper Title'}</p>
            <p>{authorName || 'Author Name'}</p>
            <p>{institution || 'Institution'}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="tpg-footer">
    <button class="btn-secondary" on:click={handleDownloadDocx} type="button">
      Download as TXT
    </button>
    <div class="footer-right">
      <button class="btn-secondary" on:click={() => dispatch('close')} type="button">Cancel</button>
      <button class="btn-primary" on:click={handleInsert} type="button" disabled={!editor}>
        Insert title page
      </button>
    </div>
  </div>
</div>

<style>
  .tpg {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 90vh;
  }

  .tpg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .tpg-title {
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

  .tpg-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .tpg-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .tpg-row label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }

  .tpg-columns {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
  }

  .tpg-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tpg-preview {
    width: 220px;
    flex-shrink: 0;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  .preview-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .preview-page {
    font-family: 'Times New Roman', Times, serif;
    font-size: 9pt;
    line-height: 1.8;
    color: #111;
    background: white;
    padding: var(--space-3);
    border-radius: 2px;
    text-align: center;
  }

  .preview-page p { margin: 0; }

  .preview-title {
    font-weight: normal;
    margin-bottom: 0.3em;
  }

  .preview-title-bold {
    font-weight: bold;
    margin-bottom: 0.3em;
  }

  .preview-mla { text-align: left; }
  .preview-left { text-align: left; }
  .preview-center { text-align: center; }

  .tpg-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: var(--space-2);
  }

  .footer-right {
    display: flex;
    gap: var(--space-2);
  }
</style>
