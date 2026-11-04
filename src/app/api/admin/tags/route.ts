import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const snippets = await prisma.snippet.findMany({
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();

    for (const snippet of snippets) {
      if (!snippet.tags) continue;
      const parts = snippet.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const uniqueInSnippet = new Set(parts);
      for (const t of uniqueInSnippet) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }

    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error("GET admin tags error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load tags" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetTag = searchParams.get("tag")?.trim();

    if (!targetTag) {
      return NextResponse.json({ success: false, error: "Missing tag parameter" }, { status: 400 });
    }

    const snippets = await prisma.snippet.findMany({
      where: {
        tags: {
          contains: targetTag,
        },
      },
      select: { id: true, tags: true },
    });

    let updatedCount = 0;
    const lowerTarget = targetTag.toLowerCase();

    for (const snippet of snippets) {
      const parts = snippet.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const filtered = parts.filter((t) => t.toLowerCase() !== lowerTarget);

      if (filtered.length !== parts.length) {
        await prisma.snippet.update({
          where: { id: snippet.id },
          data: { tags: filtered.join(", ") },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    console.error("DELETE admin tag error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete tag" },
      { status: 500 }
    );
  }
}
