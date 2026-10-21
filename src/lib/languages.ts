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
  const lower = filename.toLowerCase();

  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  if (lower === "makefile") return "bash";

  const ext = lower.split(".").pop() || "";
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.aliases.includes(ext) || lang.extension === ext) {
      return lang.id;
    }
  }

  return "plaintext";
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
