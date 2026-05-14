import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const flowdeskHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "var(--color-accent-strong)", fontWeight: "700" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, color: "var(--color-blue)", textDecoration: "underline" },
  { tag: tags.monospace, color: "var(--color-amber)" },
  { tag: tags.keyword, color: "var(--color-accent)" },
]);

const flowdeskEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--color-ink)",
    backgroundColor: "var(--color-surface)",
    fontSize: "14px",
  },
  ".cm-scroller": {
    fontFamily:
      '"SFMono-Regular", "Cascadia Code", "Roboto Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
    lineHeight: "1.65",
  },
  ".cm-content": {
    padding: "18px 18px 32px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-surface-subtle)",
    color: "var(--color-muted)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--color-surface-subtle)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-surface-subtle)",
    color: "var(--color-accent)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgb(76 196 183 / 0.24) !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRootRef.current) {
      return undefined;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        markdown(),
        syntaxHighlighting(flowdeskHighlightStyle),
        flowdeskEditorTheme,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const editorView = new EditorView({
      state,
      parent: editorRootRef.current,
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView || editorView.state.doc.toString() === value) {
      return;
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  return <div ref={editorRootRef} className="h-full overflow-hidden" />;
}
