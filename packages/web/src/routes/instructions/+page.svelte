<script lang="ts">
  import { base } from '$app/paths';

  const sections = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'citation-styles', label: 'Citation Styles' },
    { id: 'adding-sources', label: 'Adding Sources' },
    { id: 'citations-in-paper', label: 'Citations in Your Paper' },
    { id: 'paper-types', label: 'Paper Types' },
    { id: 'title-page', label: 'Title Page' },
    { id: 'running-head', label: 'Running Head (APA)' },
    { id: 'exporting', label: 'Exporting Your Paper' },
    { id: 'reference-library', label: 'Reference Library' },
    { id: 'importing', label: 'Importing Papers' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts' },
    { id: 'faq', label: 'FAQ' },
  ];

  const shortcuts = [
    { keys: ['Ctrl+B', '⌘B'], action: 'Bold' },
    { keys: ['Ctrl+I', '⌘I'], action: 'Italic' },
    { keys: ['Ctrl+U', '⌘U'], action: 'Underline' },
    { keys: ['Ctrl+Z', '⌘Z'], action: 'Undo' },
    { keys: ['Ctrl+Shift+Z', '⌘⇧Z'], action: 'Redo' },
  ];

  const faq = [
    {
      q: 'Is my data stored on a server?',
      a: 'No — everything is stored in your browser\'s local storage. No account is needed and nothing leaves your device.',
    },
    {
      q: 'Can I use this on multiple devices?',
      a: 'Export a .perrla backup file from your current device and import it on the other device. Your papers will be fully restored.',
    },
    {
      q: 'Is it really free?',
      a: 'Yes — perrla-free is MIT licensed and open source on GitHub. There are no subscriptions or hidden fees.',
    },
    {
      q: 'What if I clear my browser data?',
      a: 'Your papers will be lost if you clear local storage. Use Export → .perrla regularly as a backup to avoid data loss.',
    },
    {
      q: 'Which browser works best?',
      a: 'Chrome or Edge (Chromium-based) give the best PDF export quality via the browser print dialog.',
    },
  ];
</script>

<svelte:head>
  <title>Help — perrla-free</title>
</svelte:head>

<div class="instructions-page">
  <!-- Sticky TOC sidebar -->
  <nav class="toc" aria-label="Table of contents">
    <p class="toc-heading">On this page</p>
    <ul>
      {#each sections as section}
        <li>
          <a href="#{section.id}" class="toc-link">{section.label}</a>
        </li>
      {/each}
    </ul>
    <div class="toc-divider"></div>
    <a href="{base}/" class="toc-back">← Back to papers</a>
  </nav>

  <!-- Main content -->
  <article class="content">
    <header class="page-header">
      <h1 class="page-title">Help &amp; Documentation</h1>
      <p class="page-subtitle">Everything you need to write a properly formatted academic paper.</p>
    </header>

    <!-- Getting Started -->
    <section id="getting-started" class="section">
      <h2 class="section-title">Getting Started</h2>

      <h3 class="subsection-title">Creating your first paper</h3>
      <p>From the home screen, click <kbd>+ New Paper</kbd> in the sidebar. Enter a title, then pick a citation style. Your paper opens immediately in the editor — no sign-up required.</p>

      <h3 class="subsection-title">The three-panel layout</h3>
      <div class="panel-grid">
        <div class="panel-card">
          <span class="panel-label">Sidebar</span>
          <p>Switch between your paper list, the reference library, and the citation builder. Style settings live here too.</p>
        </div>
        <div class="panel-card">
          <span class="panel-label">Editor</span>
          <p>A page-accurate WYSIWYG editor that mirrors your final document. The toolbar gives you formatting, paper type, and title page controls.</p>
        </div>
        <div class="panel-card">
          <span class="panel-label">References</span>
          <p>A live preview of your formatted reference list that updates every time you add or edit a source. Toggle it with <strong>Show Refs</strong>.</p>
        </div>
      </div>

      <h3 class="subsection-title">Autosave</h3>
      <p>Your paper saves automatically to local storage 800 ms after you stop typing. There is no manual save button — just write.</p>
    </section>

    <!-- Citation Styles -->
    <section id="citation-styles" class="section">
      <h2 class="section-title">Citation Styles</h2>
      <p>perrla-free supports five citation styles out of the box. Choose the one required by your institution or instructor.</p>

      <table class="style-table">
        <thead>
          <tr>
            <th>Style</th>
            <th>Edition</th>
            <th>Common disciplines</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>APA</strong></td>
            <td>7th</td>
            <td>Psychology, education, social sciences</td>
          </tr>
          <tr>
            <td><strong>MLA</strong></td>
            <td>9th</td>
            <td>Humanities, literature, language</td>
          </tr>
          <tr>
            <td><strong>Chicago (Author-Date)</strong></td>
            <td>17th</td>
            <td>History, arts, humanities</td>
          </tr>
          <tr>
            <td><strong>Turabian</strong></td>
            <td>9th</td>
            <td>Similar to Chicago; common in universities</td>
          </tr>
          <tr>
            <td><strong>IEEE</strong></td>
            <td>—</td>
            <td>Engineering, computer science</td>
          </tr>
        </tbody>
      </table>

      <div class="tip">
        <span class="tip-label">How to switch styles</span>
        Open the sidebar → scroll to the <strong>Citation Style</strong> section → pick a style from the dropdown. All existing citations update automatically.
      </div>
    </section>

    <!-- Adding Sources -->
    <section id="adding-sources" class="section">
      <h2 class="section-title">Adding Sources</h2>
      <p>Open the citation builder by clicking <kbd>+ Source</kbd> in the top bar or the sidebar tab.</p>

      <h3 class="subsection-title">Quick Fill</h3>
      <p>Paste a <strong>DOI</strong>, <strong>ISBN</strong>, or <strong>URL</strong> into the Quick Fill field. perrla-free fetches the metadata automatically and pre-fills every required field. Review and correct before saving.</p>

      <h3 class="subsection-title">Manual entry</h3>
      <p>Select a source type from the dropdown, then fill in each field. Required fields are marked — you cannot save until they are complete.</p>

      <h3 class="subsection-title">Supported source types</h3>
      <ul class="source-list">
        <li>Journal Article</li>
        <li>Book</li>
        <li>Website</li>
        <li>Conference Paper</li>
        <li>Thesis</li>
        <li>Newspaper</li>
        <li>Report</li>
        <li>Film</li>
        <li>Podcast</li>
        <li>Social Media</li>
      </ul>

      <p>When you are ready, click <kbd>Save Source</kbd>. The source is added to your paper and appears in the sources bar at the bottom of the editor.</p>
    </section>

    <!-- Citations in paper -->
    <section id="citations-in-paper" class="section">
      <h2 class="section-title">Citations in Your Paper</h2>
      <ol class="steps">
        <li>Place your cursor in the editor where you want the citation inserted.</li>
        <li>In the sources bar at the bottom of the editor, click the <kbd>cite</kbd> button next to the source you want.</li>
        <li>An in-text citation is inserted at your cursor — for example, <code>(Smith, 2023)</code> for APA.</li>
        <li>The References panel on the right updates immediately with a fully formatted entry.</li>
      </ol>
      <p>Citation format follows the active style automatically. Switching styles reformats all citations in place.</p>
    </section>

    <!-- Paper Types -->
    <section id="paper-types" class="section">
      <h2 class="section-title">Paper Types</h2>
      <p>Use the <strong>Research Paper ▾</strong> dropdown in the editor toolbar to switch between paper types at any time.</p>

      <table class="style-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Research Paper</strong></td>
            <td>Standard full paper with title page, body, and references.</td>
          </tr>
          <tr>
            <td><strong>Discussion Post</strong></td>
            <td>Short response (250–500 words). No title page required.</td>
          </tr>
          <tr>
            <td><strong>Reference List</strong></td>
            <td>A formatted reference list only — no body text.</td>
          </tr>
          <tr>
            <td><strong>Annotated Bibliography</strong></td>
            <td>References with a 150-word annotation per source.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Title Page -->
    <section id="title-page" class="section">
      <h2 class="section-title">Title Page</h2>
      <ol class="steps">
        <li>Click <kbd>Title Page</kbd> in the editor toolbar.</li>
        <li>Fill in: title, your name, course name, instructor, institution, and date.</li>
        <li>The preview updates in real time, formatted to your active citation style.</li>
        <li>Click <kbd>Insert title page</kbd> to add it to your document.</li>
      </ol>
      <p>The title page is included automatically when you export to DOCX.</p>
    </section>

    <!-- Running Head -->
    <section id="running-head" class="section">
      <h2 class="section-title">Running Head (APA)</h2>
      <p>For APA papers, a running head is displayed at the top of the page simulation in the editor. It uses the first 50 characters of your paper title in ALL CAPS, as required by APA 7th edition.</p>
      <p>The running head is included automatically when you export to DOCX — no extra steps needed.</p>
    </section>

    <!-- Exporting -->
    <section id="exporting" class="section">
      <h2 class="section-title">Exporting Your Paper</h2>
      <p>Click <kbd>Export</kbd> in the top-right toolbar to open the export menu.</p>

      <table class="style-table">
        <thead>
          <tr>
            <th>Format</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>DOCX</strong></td>
            <td>A properly formatted Word document ready to submit. Fonts, margins, spacing, and the title page are all included.</td>
          </tr>
          <tr>
            <td><strong>PDF</strong></td>
            <td>Opens your browser's print dialog. Select <em>Save as PDF</em> as the destination.</td>
          </tr>
          <tr>
            <td><strong>Markdown</strong></td>
            <td>Plain text with citation syntax — useful for version control or further processing.</td>
          </tr>
          <tr>
            <td><strong>.perrla</strong></td>
            <td>A backup file containing your full paper and all sources. Re-import it on any device running perrla-free.</td>
          </tr>
        </tbody>
      </table>

      <div class="tip">
        <span class="tip-label">Best practice</span>
        Export a .perrla backup after every major writing session. It is the only way to move your work between devices or recover from a browser data clear.
      </div>
    </section>

    <!-- Reference Library -->
    <section id="reference-library" class="section">
      <h2 class="section-title">Reference Library</h2>
      <p>The library lets you build a personal collection of sources that can be reused across multiple papers.</p>
      <ol class="steps">
        <li>Click the <strong>Library</strong> tab in the sidebar to open it.</li>
        <li>In any open paper, click <kbd>Save to library</kbd> on a source to add it to the library.</li>
        <li>In the library, click <kbd>Add to paper</kbd> next to any source to import it into your current paper.</li>
        <li>You can attach personal research notes to any library source for future reference.</li>
      </ol>
    </section>

    <!-- Importing -->
    <section id="importing" class="section">
      <h2 class="section-title">Importing Papers</h2>
      <p>Click <kbd>Import</kbd> in the sidebar to load a <code>.perrla</code> backup file. The paper — including all sources and settings — will be fully restored.</p>
    </section>

    <!-- Keyboard Shortcuts -->
    <section id="shortcuts" class="section">
      <h2 class="section-title">Keyboard Shortcuts</h2>
      <table class="style-table shortcuts-table">
        <thead>
          <tr>
            <th>Windows / Linux</th>
            <th>macOS</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each shortcuts as shortcut}
            <tr>
              <td><kbd class="kbd">{shortcut.keys[0]}</kbd></td>
              <td><kbd class="kbd">{shortcut.keys[1]}</kbd></td>
              <td>{shortcut.action}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <!-- FAQ -->
    <section id="faq" class="section">
      <h2 class="section-title">FAQ</h2>
      <div class="faq-list">
        {#each faq as item}
          <div class="faq-item">
            <p class="faq-q">{item.q}</p>
            <p class="faq-a">{item.a}</p>
          </div>
        {/each}
      </div>
    </section>
  </article>
</div>

<style>
  /* ---- Page shell ---- */
  .instructions-page {
    display: flex;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* ---- TOC sidebar ---- */
  .toc {
    width: 200px;
    flex-shrink: 0;
    padding: var(--space-6) var(--space-4);
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    overflow-y: auto;
    position: sticky;
    top: 0;
    height: 100%;
  }

  .toc-heading {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-3);
  }

  .toc ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toc-link {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    padding: 4px var(--space-2);
    border-radius: var(--radius-sm);
    line-height: 1.4;
    transition: color 0.1s, background 0.1s;
  }

  .toc-link:hover {
    color: var(--color-text);
    background: var(--color-surface-2);
  }

  .toc-divider {
    border-top: 1px solid var(--color-border);
    margin: var(--space-4) 0;
  }

  .toc-back {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    padding: 4px var(--space-2);
    display: block;
    border-radius: var(--radius-sm);
    transition: color 0.1s;
  }

  .toc-back:hover {
    color: var(--color-accent);
  }

  /* ---- Main content ---- */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-8) var(--space-8) 80px;
    max-width: 780px;
  }

  /* ---- Page header ---- */
  .page-header {
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--color-border);
  }

  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .page-subtitle {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  /* ---- Sections ---- */
  .section {
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border);
  }

  .section:last-child {
    border-bottom: none;
  }

  .section-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-4);
  }

  .subsection-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
    margin-top: var(--space-5);
    margin-bottom: var(--space-2);
  }

  .section p {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: 1.65;
    margin-bottom: var(--space-3);
  }

  .section p:last-child {
    margin-bottom: 0;
  }

  /* ---- Keyboard key ---- */
  kbd {
    display: inline-block;
    padding: 1px 6px;
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    white-space: nowrap;
  }

  kbd.kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  code {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 1px 5px;
    color: var(--color-text);
  }

  /* ---- Three-panel explainer ---- */
  .panel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    margin: var(--space-4) 0;
  }

  .panel-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .panel-label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: var(--space-2);
  }

  .panel-card p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.55;
    margin: 0;
  }

  /* ---- Tip callout ---- */
  .tip {
    background: var(--color-accent-light);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    margin-top: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .tip-label {
    display: block;
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: var(--space-1);
    font-size: var(--font-size-sm);
  }

  /* ---- Tables ---- */
  .style-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    margin-top: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .style-table th {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-2);
    color: var(--color-text-secondary);
    font-weight: 600;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .style-table td {
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
    line-height: 1.5;
    vertical-align: top;
  }

  .style-table tr:last-child td {
    border-bottom: none;
  }

  .style-table tr:nth-child(even) td {
    background: var(--color-bg);
  }

  .shortcuts-table kbd {
    font-size: var(--font-size-xs);
  }

  /* ---- Source list ---- */
  .source-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-1) var(--space-4);
    list-style: none;
    margin: var(--space-3) 0;
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .source-list li {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    padding: 2px 0;
  }

  .source-list li::before {
    content: '·  ';
    color: var(--color-text-muted);
  }

  /* ---- Ordered steps ---- */
  .steps {
    padding-left: var(--space-5);
    margin: var(--space-3) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .steps li {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: 1.6;
    padding-left: var(--space-2);
  }

  /* ---- FAQ ---- */
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .faq-item {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    background: var(--color-surface);
  }

  .faq-q {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .faq-a {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }
</style>
