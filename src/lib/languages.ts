export interface LanguageOption {
  id: string;
  name: string;
  extension: string;
  color: string;
  aliases: string[];
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: "typescript", name: "TypeScript", extension: "ts", color: "#3178c6", aliases: ["ts", "tsx"] },
  { id: "javascript", name: "JavaScript", extension: "js", color: "#f7df1e", aliases: ["js", "jsx", "mjs", "cjs"] },
  { id: "python", name: "Python", extension: "py", color: "#3776ab", aliases: ["py", "pyw"] },
  { id: "rust", name: "Rust", extension: "rs", color: "#dea584", aliases: ["rs"] },
  { id: "go", name: "Go", extension: "go", color: "#00add8", aliases: ["go"] },
  { id: "html", name: "HTML", extension: "html", color: "#e34f26", aliases: ["html", "htm"] },
  { id: "css", name: "CSS", extension: "css", color: "#1572b6", aliases: ["css", "scss", "sass", "less"] },
  { id: "json", name: "JSON", extension: "json", color: "#cbcb41", aliases: ["json", "jsonc"] },
  { id: "yaml", name: "YAML", extension: "yaml", color: "#cb171e", aliases: ["yml", "yaml"] },
  { id: "sql", name: "SQL", extension: "sql", color: "#e38c00", aliases: ["sql"] },
  { id: "bash", name: "Shell / Bash", extension: "sh", color: "#89e051", aliases: ["sh", "bash", "zsh", "fish"] },
  { id: "dockerfile", name: "Dockerfile", extension: "dockerfile", color: "#2496ed", aliases: ["dockerfile", "docker"] },
  { id: "markdown", name: "Markdown", extension: "md", color: "#083fa1", aliases: ["md", "markdown"] },
  { id: "csharp", name: "C#", extension: "cs", color: "#178600", aliases: ["cs"] },
  { id: "cpp", name: "C++", extension: "cpp", color: "#f34b7d", aliases: ["cpp", "cc", "cxx", "h", "hpp"] },
  { id: "c", name: "C", extension: "c", color: "#555555", aliases: ["c", "h"] },
  { id: "java", name: "Java", extension: "java", color: "#b07219", aliases: ["java"] },
  { id: "kotlin", name: "Kotlin", extension: "kt", color: "#A97BFF", aliases: ["kt", "kts"] },
  { id: "php", name: "PHP", extension: "php", color: "#4F5D95", aliases: ["php"] },
  { id: "ruby", name: "Ruby", extension: "rb", color: "#701516", aliases: ["rb"] },
  { id: "swift", name: "Swift", extension: "swift", color: "#F05138", aliases: ["swift"] },
  { id: "xml", name: "XML", extension: "xml", color: "#0060ac", aliases: ["xml", "svg"] },
  { id: "plaintext", name: "Plain Text", extension: "txt", color: "#71717a", aliases: ["txt", "text", "log"] },
];

export function detectLanguageFromFilename(filename: string): string {
  if (!filename) return "plaintext";
  const lower = filename.toLowerCase().trim();

  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  if (lower === "makefile") return "bash";
  if (lower === ".env" || lower.startsWith(".env.")) return "bash";

  const parts = lower.split(".");
  if (parts.length <= 1) return "plaintext";

  const ext = parts.pop() || "";
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.aliases.includes(ext) || lang.extension === ext) {
      return lang.id;
    }
  }

  return "plaintext";
}

export function detectLanguageFromCode(code: string): string | null {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim();
  if (trimmed.length < 6) return null;

  // 1. Shebang / XML / PHP / HTML initial headers
  if (trimmed.startsWith("<?php")) return "php";
  if (trimmed.startsWith("<!DOCTYPE html") || /^<html[\s>]/i.test(trimmed)) return "html";
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<svg")) return "xml";
  if (/^#!\/.*(bash|sh|zsh)/m.test(trimmed)) return "bash";
  if (/^#!\/.*python/m.test(trimmed)) return "python";
  if (/^#!\/.*node/m.test(trimmed)) return "javascript";

  // 2. Strict JSON check
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        return "json";
      }
    } catch {}
  }

  // 3. Dockerfile check
  const dockerfileDirectives = [
    /^FROM\s+/im,
    /^RUN\s+/im,
    /^CMD\s+/im,
    /^WORKDIR\s+/im,
    /^COPY\s+/im,
    /^ENTRYPOINT\s+/im,
    /^EXPOSE\s+/im,
    /^ENV\s+/im,
  ];
  const dockerMatches = dockerfileDirectives.filter((regex) => regex.test(trimmed)).length;
  if (dockerMatches >= 2 || (dockerMatches >= 1 && /^FROM\s+[a-z0-9_.-]+/im.test(trimmed))) {
    return "dockerfile";
  }

  // 4. SQL check
  const sqlPatterns = [
    /\bSELECT\s+.+\s+FROM\b/i,
    /\bINSERT\s+INTO\s+.+\s+VALUES\b/i,
    /\bCREATE\s+TABLE\s+/i,
    /\bALTER\s+TABLE\s+/i,
    /\bUPDATE\s+.+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+TABLE\b/i,
    /\bPRIMARY\s+KEY\b/i,
  ];
  if (sqlPatterns.some((p) => p.test(trimmed))) {
    return "sql";
  }

  // 5. HTML tags check
  if (
    /<(div|span|h[1-6]|p|section|header|footer|button|input|form|table|tr|td|script|style|ul|ol|li)\b[^>]*>/i.test(
      trimmed
    ) &&
    /<\/(div|span|h[1-6]|p|section|header|footer|button|input|form|table|tr|td|script|style|ul|ol|li)>/i.test(
      trimmed
    )
  ) {
    return "html";
  }

  // 6. CSS check
  if (
    /(@media|@keyframes|@import|\.[\w-]+\s*\{|#[\w-]+\s*\{)/.test(trimmed) &&
    /(color\s*:|background\s*:|margin\s*:|padding\s*:|display\s*:|font-size\s*:)/.test(trimmed)
  ) {
    return "css";
  }

  // 7. Rust check
  const rustScore =
    (/\bfn\s+\w+\s*\(/.test(trimmed) ? 2 : 0) +
    (/\b(let\s+mut|pub\s+fn|impl\s+|println!|vec!|match\s+\w+\s*\{)\b/.test(trimmed) ? 3 : 0) +
    (/\b(struct\s+\w+\s*\{|enum\s+\w+\s*\{|use\s+std::)/.test(trimmed) ? 2 : 0) +
    (/->\s*(Result<|Option<|[A-Z]\w*)/.test(trimmed) ? 2 : 0);
  if (rustScore >= 4) return "rust";

  // 8. Go check
  const goScore =
    (/\bpackage\s+\w+/.test(trimmed) ? 3 : 0) +
    (/\bfunc\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/.test(trimmed) ? 3 : 0) +
    (/(:=|fmt\.Print|fmt\.Sprint|go\s+func\(|chan\s+\w+)/.test(trimmed) ? 3 : 0) +
    (/\btype\s+\w+\s+struct\s*\{/.test(trimmed) ? 3 : 0);
  if (goScore >= 4) return "go";

  // 9. Python check
  const pythonScore =
    (/\bdef\s+\w+\s*\(.*?\)\s*:/.test(trimmed) ? 3 : 0) +
    (/\bclass\s+\w+(\(.*?\))?\s*:/.test(trimmed) ? 2 : 0) +
    (/\b(from\s+[\w.]+\s+import|import\s+[\w.]+)/.test(trimmed) && !/import\s+.*?\s+from\s+['"]/.test(trimmed) ? 2 : 0) +
    (/\b(elif|self\.|print\(|__name__\s*==\s*['"]__main__['"]|None|True|False)\b/.test(trimmed) ? 2 : 0) +
    (!/[;{}]/.test(trimmed) && /\n\s{2,4}\w+/.test(trimmed) ? 2 : 0);
  if (pythonScore >= 4) return "python";

  // 10. C / C++ check
  if (
    /#include\s+[<"](iostream|vector|string|map|algorithm|cmath)[>"]/.test(trimmed) ||
    /std::(cout|vector|string|cin|endl)/.test(trimmed)
  ) {
    return "cpp";
  }
  if (
    /#include\s+[<"](stdio\.h|stdlib\.h|string\.h)[>"]/.test(trimmed) ||
    /\b(printf|malloc|free)\s*\(/.test(trimmed)
  ) {
    return "c";
  }

  // 11. C# check
  if (
    /\busing\s+System(\.[\w]+)*;/.test(trimmed) ||
    /\bConsole\.WriteLine\s*\(/.test(trimmed) ||
    /\bnamespace\s+[\w.]+\s*\{/.test(trimmed)
  ) {
    return "csharp";
  }

  // 12. Java / Kotlin check
  if (
    /\bpublic\s+class\s+\w+/.test(trimmed) &&
    /\b(public\s+static\s+void\s+main|System\.out\.println)/.test(trimmed)
  ) {
    return "java";
  }
  if (
    /\bfun\s+\w+\s*\(/.test(trimmed) &&
    /\b(val\s+|var\s+|println\()/.test(trimmed)
  ) {
    return "kotlin";
  }

  // 13. YAML check
  if (
    (/^---\s*$/m.test(trimmed) || (/^[a-zA-Z0-9_-]+\s*:\s*.+$/m.test(trimmed) && /^\s*-\s+[a-zA-Z0-9_-]+/m.test(trimmed))) &&
    !/[;{}]/.test(trimmed) &&
    !/\b(def|class|function|var|let|const)\b/.test(trimmed)
  ) {
    return "yaml";
  }

  // 14. TypeScript vs JavaScript
  const isTypeScript =
    /\b(interface\s+\w+|type\s+\w+\s*=|enum\s+\w+|as\s+const)\b/.test(trimmed) ||
    /:\s*(string|number|boolean|any|void|unknown|never|Record<|Array<)[;,\s\)=]/.test(trimmed) ||
    /<[A-Z]\w*(\s*extends\s+.*?)?>\s*\(/.test(trimmed);

  const isJavaScript =
    /\b(const|let|var)\s+\w+\s*=/.test(trimmed) ||
    /\bfunction\s+\w*\s*\(/.test(trimmed) ||
    /\bconsole\.(log|error|warn)\s*\(/.test(trimmed) ||
    /\b(import\s+.*?\s+from\s+['"]|export\s+(default\s+)?)/.test(trimmed) ||
    /=>\s*\{?/.test(trimmed) ||
    /\brequire\s*\(['"].*?['"]\)/.test(trimmed);

  if (isTypeScript) return "typescript";
  if (isJavaScript) return "javascript";

  // 15. Markdown check
  if (
    /^#{1,3}\s+\w+/m.test(trimmed) &&
    (/^-\s+\w+/m.test(trimmed) || /```[a-z]*/.test(trimmed) || /\[.*?\]\(.*?\)/.test(trimmed))
  ) {
    return "markdown";
  }

  // 16. Shell / Bash check
  if (
    /^(sudo\s+|chmod\s+|npm\s+|git\s+|curl\s+|docker\s+|export\s+\w+=|echo\s+['"])/m.test(trimmed) ||
    /\b(if\s+\[.*?\];\s*then|fi)\b/.test(trimmed)
  ) {
    return "bash";
  }

  return null;
}

export function getDefaultExtensionForLanguage(langId: string): string {
  const meta = getLanguageMeta(langId);
  return meta.extension || "txt";
}

export function replaceFileExtension(filename: string, newLangId: string): string {
  if (!filename) {
    const ext = getDefaultExtensionForLanguage(newLangId);
    return `snippet.${ext}`;
  }

  const lower = filename.toLowerCase().trim();
  if (newLangId === "dockerfile" && (lower === "dockerfile" || lower.startsWith("dockerfile."))) {
    return filename;
  }

  const newExt = getDefaultExtensionForLanguage(newLangId);
  if (!newExt) return filename;

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${filename}.${newExt}`;
  }

  const baseName = filename.substring(0, dotIndex);
  return `${baseName}.${newExt}`;
}

export function getLanguageMeta(id: string): LanguageOption {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.id.toLowerCase() === id.toLowerCase()) || {
      id: "plaintext",
      name: "Plain Text",
      extension: "txt",
      color: "#71717a",
      aliases: ["txt"],
    }
  );
}
