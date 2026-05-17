<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import { TextAlign } from '@tiptap/extension-text-align';
  import { TextStyle } from '@tiptap/extension-text-style';
  import { FontFamily } from '@tiptap/extension-font-family';
  import Highlight from '@tiptap/extension-highlight';
  import Placeholder from '@tiptap/extension-placeholder';
  import Typography from '@tiptap/extension-typography';
  import type { Paper } from '@perrla-free/core';
  import { updateContent, activePaper, currentStyle } from '../store.js';
  import { CitationNode } from '../tiptap/CitationNode.js';
  import TitlePageGenerator from './TitlePageGenerator.svelte';

  export let paper: Paper;
  /** Expose the editor instance so parent can call insertCitation */
  export let editor: Editor | null = null;

  const dispatch = createEventDispatcher<{ contentChange: object; editorReady: Editor; citationClick: string }>();

  let editorEl: HTMLElement;
  let showTitlePage = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Running head: APA 7 only — abbreviated title ≤50 chars, ALL CAPS
  $: isApa7 = $currentStyle === 'apa7';
  $: runningHeadText = (paper.settings.runningHead
    ? paper.settings.runningHead
    : paper.settings.title.toUpperCase()
  ).slice(0, 50);

  // Toolbar active states
  $: isBold = editor?.isActive('bold') ?? false;
  $: isItalic = editor?.isActive('italic') ?? false;
  $: isUnderline = editor?.isActive('underline') ?? false;
  $: isH1 = editor?.isActive('heading', { level: 1 }) ?? false;
  $: isH2 = editor?.isActive('heading', { level: 2 }) ?? false;
  $: isH3 = editor?.isActive('heading', { level: 3 }) ?? false;
  $: alignLeft = editor?.isActive({ textAlign: 'left' }) ?? false;
  $: alignCenter = editor?.isActive({ textAlign: 'center' }) ?? false;
  $: alignRight = editor?.isActive({ textAlign: 'right' }) ?? false;
  $: alignJustify = editor?.isActive({ textAlign: 'justify' }) ?? false;

  function scheduleSave(content: object) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await updateContent(content);
    }, 800);
  }

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          defaultAlignment: 'left',
        }),
        TextStyle,
        FontFamily.configure({ types: ['textStyle'] }),
        Highlight.configure({ multicolor: false }),
        Placeholder.configure({
          placeholder: 'Start writing your paper here...',
        }),
        Typography,
        CitationNode.configure({
          onCitationClick: (sourceId: string) => {
            dispatch('citationClick', sourceId);
          },
        }),
      ],
      content: paper.content,
      onUpdate: ({ editor: e }) => {
        const json = e.getJSON();
        dispatch('contentChange', json);
        scheduleSave(json);
      },
      onSelectionUpdate: () => {
        // Force reactivity update for toolbar active states
        editor = editor;
      },
      editorProps: {
        attributes: {
          class: 'ProseMirror',
          spellcheck: 'true',
        },
      },
    });
    dispatch('editorReady', editor);
  });

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    editor?.destroy();
  });

  // Sync if paper changes externally
  $: if (editor && paper) {
    const currentJson = JSON.stringify(editor.getJSON());
    const newJson = JSON.stringify(paper.content);
    if (currentJson !== newJson) {
      editor.commands.setContent(paper.content, false);
    }
  }

  // ---- Toolbar actions ----

  function toggleBold() { editor?.chain().focus().toggleBold().run(); editor = editor; }
  function toggleItalic() { editor?.chain().focus().toggleItalic().run(); editor = editor; }
  function toggleUnderline() { editor?.chain().focus().toggleUnderline().run(); editor = editor; }
  function toggleHighlight() { editor?.chain().focus().toggleHighlight().run(); }
  function setH1() { editor?.chain().focus().toggleHeading({ level: 1 }).run(); editor = editor; }
  function setH2() { editor?.chain().focus().toggleHeading({ level: 2 }).run(); editor = editor; }
  function setH3() { editor?.chain().focus().toggleHeading({ level: 3 }).run(); editor = editor; }
  function setParagraph() { editor?.chain().focus().setParagraph().run(); editor = editor; }
  function alignLeftFn() { editor?.chain().focus().setTextAlign('left').run(); editor = editor; }
  function alignCenterFn() { editor?.chain().focus().setTextAlign('center').run(); editor = editor; }
  function alignRightFn() { editor?.chain().focus().setTextAlign('right').run(); editor = editor; }
  function alignJustifyFn() { editor?.chain().focus().setTextAlign('justify').run(); editor = editor; }
  function bulletList() { editor?.chain().focus().toggleBulletList().run(); }
  function orderedList() { editor?.chain().focus().toggleOrderedList().run(); }
  function blockquote() { editor?.chain().focus().toggleBlockquote().run(); }
</script>

<div class="editor-shell">
  <!-- Toolbar -->
  <div class="toolbar" role="toolbar" aria-label="Text formatting">
    <!-- Text style -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        class:active={isH1}
        on:click={setH1}
        title="Heading 1 (APA Level 1)"
        type="button"
      >H1</button>
      <button
        class="toolbar-btn"
        class:active={isH2}
        on:click={setH2}
        title="Heading 2 (APA Level 2)"
        type="button"
      >H2</button>
      <button
        class="toolbar-btn"
        class:active={isH3}
        on:click={setH3}
        title="Heading 3 (APA Level 3)"
        type="button"
      >H3</button>
      <button
        class="toolbar-btn"
        on:click={setParagraph}
        title="Paragraph"
        type="button"
      >¶</button>
    </div>

    <div class="toolbar-divider" />

    <!-- Inline formatting -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn bold-btn"
        class:active={isBold}
        on:click={toggleBold}
        title="Bold (Ctrl+B)"
        type="button"
      >B</button>
      <button
        class="toolbar-btn italic-btn"
        class:active={isItalic}
        on:click={toggleItalic}
        title="Italic (Ctrl+I)"
        type="button"
      ><em>I</em></button>
      <button
        class="toolbar-btn underline-btn"
        class:active={isUnderline}
        on:click={toggleUnderline}
        title="Underline (Ctrl+U)"
        type="button"
      ><u>U</u></button>
      <button
        class="toolbar-btn"
        on:click={toggleHighlight}
        title="Highlight"
        type="button"
      >✦</button>
    </div>

    <div class="toolbar-divider" />

    <!-- Alignment -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        class:active={alignLeft}
        on:click={alignLeftFn}
        title="Align left"
        type="button"
      >⬅</button>
      <button
        class="toolbar-btn"
        class:active={alignCenter}
        on:click={alignCenterFn}
        title="Center"
        type="button"
      >⇔</button>
      <button
        class="toolbar-btn"
        class:active={alignRight}
        on:click={alignRightFn}
        title="Align right"
        type="button"
      >➡</button>
      <button
        class="toolbar-btn"
        class:active={alignJustify}
        on:click={alignJustifyFn}
        title="Justify"
        type="button"
      >☰</button>
    </div>

    <div class="toolbar-divider" />

    <!-- Lists & blocks -->
    <div class="toolbar-group">
      <button class="toolbar-btn" on:click={bulletList} title="Bullet list" type="button">•—</button>
      <button class="toolbar-btn" on:click={orderedList} title="Numbered list" type="button">1—</button>
      <button class="toolbar-btn" on:click={blockquote} title="Block quote (indented)" type="button">❝</button>
    </div>

    <div class="toolbar-divider" />

    <!-- Title page -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn toolbar-btn--label"
        on:click={() => (showTitlePage = true)}
        title="Insert title page"
        type="button"
      >Title Page</button>
    </div>
  </div>

  <!-- Title Page Generator modal -->
  {#if showTitlePage}
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Title Page Generator">
      <div class="modal-panel">
        <TitlePageGenerator
          paper={paper}
          bind:editor={editor}
          on:close={() => (showTitlePage = false)}
        />
      </div>
    </div>
  {/if}

  <!-- Scrollable editor area with page simulation -->
  <div class="editor-scroll">
    <div class="editor-page">
      {#if isApa7}
        <div class="running-head" aria-label="Running head preview">
          <span class="running-head-left">{runningHeadText}</span>
          <span class="running-head-right">1</span>
        </div>
      {/if}
      <div bind:this={editorEl} class="editor-content"></div>
    </div>
  </div>
</div>

<style>
  .editor-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-3);
    height: var(--toolbar-height);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    overflow-x: auto;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--space-2);
    flex-shrink: 0;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .toolbar-btn:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  .toolbar-btn.active {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .bold-btn { font-weight: bold; }

  .toolbar-btn--label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 0 var(--space-2);
    min-width: unset;
  }

  /* Title page modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.25));
    width: min(720px, 95vw);
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Citation chip global style */
  :global(.citation-chip) {
    display: inline-block;
    background: var(--color-accent-light, #e8f0fe);
    border: 1px solid var(--color-accent, #4a6cf7);
    border-radius: 4px;
    padding: 0 4px;
    font-style: normal;
    font-size: 0.9em;
    color: var(--color-accent, #4a6cf7);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  :global(.citation-chip:hover) {
    background: var(--color-accent, #4a6cf7);
    color: white;
  }

  /* Scrollable area */
  .editor-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-4);
  }

  /* Page simulation — 8.5in × 11in with 1in margins */
  .editor-page {
    background: white;
    width: 8.5in;
    min-height: 11in;
    padding: 1in;
    margin: 32px auto;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 2;
    color: #000;
  }

  .editor-content {
    min-height: 9in;
    outline: none;
  }

  /* Running head — APA 7 only, sits inside the page simulation's top margin area */
  .running-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    /* Pull up into the 1in top padding so it mimics the printed header position */
    margin-top: calc(-1in + 0.5in);
    margin-left: calc(-1in + 0.5in);
    margin-right: calc(-1in + 0.5in);
    margin-bottom: 0.5in;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
    font-family: 'Times New Roman', Times, serif;
    font-size: 10pt;
    color: #000;
    user-select: none;
    pointer-events: none;
  }

  .running-head-left {
    letter-spacing: 0.01em;
  }

  .running-head-right {
    font-size: 10pt;
  }
</style>
