/**
 * CitationNode — inline Tiptap atom node for in-text citations.
 *
 * Renders as: <cite data-source-id="...">label</cite>
 * Stored attrs: { sourceId: string, label: string }
 * Clicking the node dispatches a custom DOM event so the page can open
 * CitationBuilder for the source.
 *
 * Usage:
 *   editor.commands.insertCitation({ sourceId: 'abc', label: '(Smith, 2023)' })
 *   — or use the standalone helper: insertCitation(editor, sourceId, label)
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface CitationOptions {
  /** Called when the user clicks an existing citation chip */
  onCitationClick?: (sourceId: string) => void;
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      /**
       * Insert an in-text citation node at the current cursor position.
       */
      insertCitation: (attrs: { sourceId: string; label: string }) => ReturnType;
    };
  }
}

export const CitationNode = Node.create<CitationOptions>({
  name: 'citation',

  // Inline, non-editable atom — cursor skips over it as a unit
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      onCitationClick: undefined,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-source-id'),
        renderHTML: (attrs) => ({
          'data-source-id': attrs.sourceId ?? '',
        }),
      },
      label: {
        default: '',
        parseHTML: (el) => el.textContent ?? '',
        // label is rendered as text content, not an attribute
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'cite[data-source-id]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(
      {
        class: 'citation-chip',
        'data-source-id': node.attrs.sourceId,
        contenteditable: 'false',
        title: `Source: ${node.attrs.sourceId}`,
      },
      this.options.HTMLAttributes,
      HTMLAttributes
    );
    return ['cite', attrs, node.attrs.label ?? ''];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('cite');
      dom.className = 'citation-chip';
      dom.setAttribute('data-source-id', node.attrs.sourceId ?? '');
      dom.setAttribute('contenteditable', 'false');
      dom.textContent = node.attrs.label ?? '';

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const handler = editor.options.editorProps?.handleClick;
        void handler;

        // Fire a custom event the Svelte layer can listen to
        const event = new CustomEvent('citation:click', {
          bubbles: true,
          detail: { sourceId: node.attrs.sourceId, pos: typeof getPos === 'function' ? getPos() : null },
        });
        dom.dispatchEvent(event);

        // Also call the option hook directly if provided
        if (this.options.onCitationClick && node.attrs.sourceId) {
          this.options.onCitationClick(node.attrs.sourceId);
        }
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertCitation:
        (attrs: { sourceId: string; label: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

/**
 * Standalone helper — insert a citation at the current cursor position.
 * Appends a space after the chip so the user can keep typing.
 */
export function insertCitation(
  editor: import('@tiptap/core').Editor,
  sourceId: string,
  label: string
): boolean {
  return editor
    .chain()
    .focus()
    .insertCitation({ sourceId, label })
    .insertContent(' ')
    .run();
}

/**
 * Quick label builder — fast, no citeproc.
 * Returns e.g. "(Smith, 2023)" for APA, "Smith 23" for MLA, "Smith, 2023" for Chicago,
 * "[1]" for IEEE (index based on sourceIndex).
 */
export function buildCitationLabel(
  style: 'apa7' | 'mla9' | 'chicago' | 'ieee',
  authors: string | undefined,
  year: string | undefined,
  sourceIndex?: number
): string {
  const lastName = authors?.split(';')[0]?.split(',')[0]?.trim() ?? 'Unknown';

  switch (style) {
    case 'apa7':
      return year ? `(${lastName}, ${year})` : `(${lastName}, n.d.)`;

    case 'mla9': {
      const shortYear = year ? year.slice(-2) : 'n.d.';
      return `${lastName} ${shortYear}`;
    }

    case 'chicago':
      return year ? `(${lastName}, ${year})` : `(${lastName})`;

    case 'ieee':
      return `[${(sourceIndex ?? 0) + 1}]`;

    default:
      return year ? `(${lastName}, ${year})` : `(${lastName})`;
  }
}
