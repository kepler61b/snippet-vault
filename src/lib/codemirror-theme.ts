import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

export const snippetVaultTheme = EditorView.theme(
  {
    "&": {
      color: "#f4f4f5",
      backgroundColor: "#09090b",
      fontSize: "13px",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineHeight: "1.6",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#a78bfa",
      padding: "10px 0",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#a78bfa",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(139, 92, 246, 0.25) !important",
    },
    ".cm-gutters": {
      backgroundColor: "#09090b",
      color: "#52525b",
      borderRight: "1px solid rgba(39, 39, 42, 0.8)",
      paddingRight: "4px",
    },
    ".cm-gutterElement": {
      padding: "0 10px 0 12px !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.035)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      color: "#a1a1aa",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(139, 92, 246, 0.25)",
      color: "#c4b5fd !important",
      outline: "1px solid #8b5cf6",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgba(39, 39, 42, 0.8)",
      border: "1px solid rgba(63, 63, 70, 0.8)",
      color: "#a1a1aa",
      borderRadius: "4px",
      padding: "0 4px",
      margin: "0 4px",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      overflow: "auto",
    },
  },
  { dark: true }
);

export const snippetVaultEditorExtensions: Extension[] = [
  vscodeDark,
  snippetVaultTheme,
  EditorView.lineWrapping,
];
