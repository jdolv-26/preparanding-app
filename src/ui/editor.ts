// 9A: CodeMirror 6, sin autocorrección, Tab = 4 espacios, barra de símbolos sobre el teclado.
// El resaltado usa los tokens code-* de DESIGN.md y sigue el tema de la página.
import { basicSetup, EditorView } from 'codemirror';
import { indentWithTab, undo } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { h } from './dom.ts';

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--text)', fontWeight: '700' },
  { tag: [t.string, t.special(t.string)], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--code-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--text-muted)', fontStyle: 'italic' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '1rem' },
  '.cm-content': { fontFamily: 'var(--font-mono)', fontVariationSettings: '"MONO" 1', caretColor: 'var(--text)' },
  '.cm-gutters': { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', borderRight: '1px solid var(--line)' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--tint)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'var(--selection) !important' },
  '&.cm-focused': { outline: 'none' },
});

const SYMBOLS: [string, string][] = [['⇥', '    '], ['(', '('], [')', ')'], ['[', '['], [']', ']'], [':', ':'], ["'", "'"], ['"', '"'], ['=', '='], ['.', '.'], ['_', '_'], ['#', '#']];

export function editor(doc: string, kind: 'python' | 'sql', onChange: (code: string) => void) {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        kind === 'python' ? python() : sql(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        keymap.of([indentWithTab]),
        syntaxHighlighting(highlight),
        theme,
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Editor de código' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      ],
    }),
  });

  const insert = (text: string) => {
    view.dispatch(view.state.replaceSelection(text));
    view.focus();
  };
  const bar = h('div', { class: 'symbols', role: 'toolbar', 'aria-label': 'Símbolos' },
    ...SYMBOLS.map(([label, text]) => h('button', { type: 'button', 'aria-label': label === '⇥' ? 'Tabulador' : `Insertar ${label}`, onmousedown: (e) => e.preventDefault(), onclick: () => insert(text) }, label)),
    h('button', { type: 'button', 'aria-label': 'Deshacer', onmousedown: (e) => e.preventDefault(), onclick: () => { undo(view); view.focus(); } }, '↶'),
  );
  return { view, bar, code: () => view.state.doc.toString() };
}
