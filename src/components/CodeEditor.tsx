"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { getCodeMirrorLanguageExtension } from "@/lib/codemirror-languages";
import { snippetVaultEditorExtensions } from "@/lib/codemirror-theme";
import { keymap } from "@codemirror/view";

// Dynamically import CodeMirror to prevent any SSR hydration mismatch
const ReactCodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-xs text-zinc-500 font-mono">
      Загрузка редактора кода...
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  onSaveShortcut?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  height = "380px",
  minHeight = "220px",
  maxHeight = "50vh",
  readOnly = false,
  autoFocus = false,
  className = "",
  onSaveShortcut,
}: CodeEditorProps) {
  const languageExtension = useMemo(() => {
    return getCodeMirrorLanguageExtension(language);
  }, [language]);

  const extensions = useMemo(() => {
    const list = [...snippetVaultEditorExtensions, ...languageExtension];

    if (onSaveShortcut) {
      list.push(
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSaveShortcut();
              return true;
            },
          },
        ])
      );
    }

    return list;
  }, [languageExtension, onSaveShortcut]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-zinc-950 font-mono text-xs sm:text-sm ${className}`}
      style={{ minHeight, maxHeight }}
    >
      <ReactCodeMirror
        value={value}
        onChange={onChange}
        theme="dark"
        extensions={extensions}
        placeholder={placeholder}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        readOnly={readOnly}
        autoFocus={autoFocus}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        className="h-full font-mono text-xs sm:text-sm"
      />
    </div>
  );
}
