import { Extension } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { php } from "@codemirror/lang-php";
import { yaml } from "@codemirror/lang-yaml";

// Legacy modes for shell, docker, ruby, swift, xml
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { xml } from "@codemirror/legacy-modes/mode/xml";

/**
 * Returns CodeMirror language extension matching the snippet language identifier.
 */
export function getCodeMirrorLanguageExtension(langId: string): Extension[] {
  const normalized = (langId || "").toLowerCase().trim();

  switch (normalized) {
    case "typescript":
    case "ts":
      return [javascript({ typescript: true, jsx: true })];
    case "javascript":
    case "js":
      return [javascript({ jsx: true })];
    case "python":
    case "py":
      return [python()];
    case "rust":
    case "rs":
      return [rust()];
    case "go":
      return [go()];
    case "html":
    case "htm":
      return [html()];
    case "xml":
    case "svg":
      return [StreamLanguage.define(xml)];
    case "css":
    case "scss":
    case "sass":
    case "less":
      return [css()];
    case "json":
    case "jsonc":
      return [json()];
    case "yaml":
    case "yml":
      return [yaml()];
    case "sql":
      return [sql()];
    case "bash":
    case "sh":
    case "zsh":
    case "shell":
      return [StreamLanguage.define(shell)];
    case "dockerfile":
    case "docker":
      return [StreamLanguage.define(dockerFile)];
    case "markdown":
    case "md":
      return [markdown()];
    case "csharp":
    case "cs":
    case "cpp":
    case "c":
      return [cpp()];
    case "java":
    case "kotlin":
    case "kt":
      return [java()];
    case "php":
      return [php()];
    case "ruby":
    case "rb":
      return [StreamLanguage.define(ruby)];
    case "swift":
      return [StreamLanguage.define(swift)];
    case "plaintext":
    case "text":
    case "txt":
    default:
      return [];
  }
}
