import prisma from "./db";

export interface FtsMatchLine {
  fileId?: string;
  filename: string;
  fileIndex: number;
  lineNumber: number;
  lineContent: string;
  highlightedLine: string;
}

export interface FtsSearchResult {
  snippetId: string;
  rank: number;
  highlightedSnippet?: string;
  matchLines: FtsMatchLine[];
}

let ftsInitialized = false;

/**
 * Initializes the SQLite FTS5 table if it doesn't already exist,
 * and ensures all existing snippets are indexed.
 */
export async function ensureFtsInitialized(): Promise<void> {
  if (ftsInitialized) return;
  ftsInitialized = true;

  try {
    // 1. Create FTS5 virtual table
    await prisma.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS snippet_fts USING fts5(
        snippetId UNINDEXED,
        fileId UNINDEXED,
        fileOrder UNINDEXED,
        title,
        description,
        tags,
        filename,
        content,
        tokenize = 'unicode61'
      );
    `);

    // 2. Check if snippet_fts has rows
    const countResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) as count FROM snippet_fts;
    `);
    const ftsCount = Number(countResult[0]?.count || 0);

    const dbSnippetCount = await prisma.snippet.count();

    // If FTS index is empty or has far fewer entries, rebuild index
    if (ftsCount === 0 && dbSnippetCount > 0) {
      console.log(`[FTS5] Initializing index for ${dbSnippetCount} snippets...`);
      await rebuildFtsIndex();
    }
  } catch (err) {
    ftsInitialized = false;
    console.warn("[FTS5] Failed to initialize FTS5 table:", err);
  }
}

/**
 * Rebuilds the entire FTS5 index from the database.
 */
export async function rebuildFtsIndex(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM snippet_fts;`);

    const snippets = await prisma.snippet.findMany({
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    for (const snippet of snippets) {
      await indexSnippet(snippet.id, snippet);
    }
    console.log(`[FTS5] Rebuild complete: indexed ${snippets.length} snippets.`);
  } catch (err) {
    console.error("[FTS5] Error rebuilding FTS index:", err);
  }
}

/**
 * Syncs a single snippet and all its files into snippet_fts.
 */
export async function indexSnippet(
  snippetId: string,
  preloadedSnippet?: any
): Promise<void> {
  try {
    await ensureFtsInitialized();

    const snippet =
      preloadedSnippet ||
      (await prisma.snippet.findUnique({
        where: { id: snippetId },
        include: {
          files: {
            orderBy: { order: "asc" },
          },
        },
      }));

    if (!snippet) {
      await deleteSnippetFromFts(snippetId);
      return;
    }

    // Remove existing rows for this snippet
    await prisma.$executeRaw`
      DELETE FROM snippet_fts WHERE snippetId = ${snippetId};
    `;

    const title = snippet.title || "";
    const description = snippet.description || "";
    const tags = snippet.tags || "";

    if (!snippet.files || snippet.files.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO snippet_fts (snippetId, fileId, fileOrder, title, description, tags, filename, content)
        VALUES (${snippetId}, ${""}, ${"0"}, ${title}, ${description}, ${tags}, ${""}, ${""});
      `;
    } else {
      for (let i = 0; i < snippet.files.length; i++) {
        const file = snippet.files[i];
        await prisma.$executeRaw`
          INSERT INTO snippet_fts (snippetId, fileId, fileOrder, title, description, tags, filename, content)
          VALUES (
            ${snippetId},
            ${file.id || ""},
            ${String(i)},
            ${title},
            ${description},
            ${tags},
            ${file.filename || ""},
            ${file.content || ""}
          );
        `;
      }
    }
  } catch (err) {
    console.warn(`[FTS5] Error indexing snippet ${snippetId}:`, err);
  }
}

/**
 * Deletes a snippet from the FTS5 index.
 */
export async function deleteSnippetFromFts(snippetId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM snippet_fts WHERE snippetId = ${snippetId};
    `;
  } catch (err) {
    console.warn(`[FTS5] Error deleting snippet ${snippetId} from FTS:`, err);
  }
}

/**
 * Sanitizes a user query into safe FTS5 query syntax.
 */
export function sanitizeFts5Query(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  // Extract quoted strings or split by words
  // E.g. "docker compose" or regular terms
  const tokens: string[] = [];

  // Match words, including Unicode (Cyrillic, Latin), numbers, hyphens, underscores
  const wordRegex = /[\p{L}\p{N}_-]+/gu;
  const matches = trimmed.match(wordRegex);

  if (!matches || matches.length === 0) {
    // If no word chars (e.g. only symbols like '::' or '$')
    return `"${trimmed.replace(/"/g, '""')}"`;
  }

  for (const match of matches) {
    const clean = match.replace(/"/g, '""');
    // Prefix match each token: "word"*
    tokens.push(`"${clean}"*`);
  }

  return tokens.join(" ");
}

/**
 * Extracts matching line numbers and highlighted code lines for a snippet's files.
 */
export function extractLineMatches(
  files: Array<{ id?: string; filename: string; content: string }>,
  query: string,
  maxMatches = 2
): FtsMatchLine[] {
  if (!query.trim() || !files || files.length === 0) return [];

  const searchWords = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim().replace(/^["']|["']$/g, ""))
    .filter((w) => w.length > 0);

  if (searchWords.length === 0) return [];

  const results: FtsMatchLine[] = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    if (!file.content) continue;

    const lines = file.content.split("\n");
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lowerLine = line.toLowerCase();

      // Check if line contains any of the search words
      const matchedWord = searchWords.find((w) => lowerLine.includes(w));
      if (matchedWord) {
        // Highlight matched terms
        let highlighted = escapeHtml(line);
        for (const w of searchWords) {
          if (!w) continue;
          const escapedWord = escapeRegExp(w);
          const regex = new RegExp(`(${escapedWord})`, "gi");
          highlighted = highlighted.replace(
            regex,
            '<mark class="bg-violet-500/30 text-violet-200 font-semibold px-0.5 rounded">$1</mark>'
          );
        }

        results.push({
          fileId: file.id,
          filename: file.filename,
          fileIndex,
          lineNumber: lineIdx + 1,
          lineContent: line.trim(),
          highlightedLine: highlighted.trim(),
        });

        if (results.length >= maxMatches) {
          return results;
        }
      }
    }
  }

  return results;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Searches snippet_fts using FTS5 MATCH and returns matching snippet IDs with snippet previews.
 */
export async function searchFts(query: string): Promise<Map<string, { rank: number; snippetText?: string }>> {
  await ensureFtsInitialized();

  const resultMap = new Map<string, { rank: number; snippetText?: string }>();
  const ftsQuery = sanitizeFts5Query(query);
  if (!ftsQuery) return resultMap;

  try {
    const rawResults: any[] = await prisma.$queryRaw`
      SELECT
        snippetId,
        rank,
        snippet(snippet_fts, 7, '<mark class="bg-violet-500/30 text-violet-200 font-semibold px-0.5 rounded">', '</mark>', '...', 15) as snip
      FROM snippet_fts
      WHERE snippet_fts MATCH ${ftsQuery}
      ORDER BY rank
      LIMIT 100;
    `;

    for (const row of rawResults) {
      if (!row.snippetId) continue;
      if (!resultMap.has(row.snippetId)) {
        resultMap.set(row.snippetId, {
          rank: Number(row.rank),
          snippetText: row.snip || undefined,
        });
      }
    }
  } catch (err) {
    console.warn(`[FTS5] FTS MATCH failed for "${query}" (ftsQuery: "${ftsQuery}"):`, err);
  }

  return resultMap;
}
