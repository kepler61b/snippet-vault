import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const snippets = await prisma.snippet.findMany({
      select: {
        tags: true,
        files: {
          select: {
            language: true,
          },
        },
      },
    });

    const tagCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    snippets.forEach((snippet) => {
      if (snippet.tags) {
        snippet.tags.split(",").forEach((t) => {
          const trimmed = t.trim().toLowerCase();
          if (trimmed) {
            tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
          }
        });
      }

      const snippetLangs = new Set<string>();
      snippet.files.forEach((file) => {
        if (file.language) {
          snippetLangs.add(file.language.toLowerCase());
        }
      });

      snippetLangs.forEach((lang) => {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      });
    });

    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const languages = Object.entries(languageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, tags, languages });
  } catch (error: any) {
    console.error("Error fetching tags and languages:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
