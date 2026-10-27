import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyDataChange } from "@/lib/sync-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const snippets = await prisma.snippet.findMany({
      select: { id: true, tags: true },
    });

    const tagCounts: Record<string, { name: string; count: number }> = {};

    for (const s of snippets) {
      if (!s.tags) continue;
      const parts = s.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const seenInSnippet = new Set<string>();
      for (const rawTag of parts) {
        const lower = rawTag.toLowerCase();
        if (seenInSnippet.has(lower)) continue;
        seenInSnippet.add(lower);

        if (!tagCounts[lower]) {
          tagCounts[lower] = { name: rawTag, count: 0 };
        }
        tagCounts[lower].count += 1;
      }
    }

    const sortedTags = Object.values(tagCounts).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      tags: sortedTags,
    });
  } catch (error: any) {
    console.error("Admin get tags error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения тегов" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tagToDelete = searchParams.get("tag")?.trim();

    if (!tagToDelete) {
      return NextResponse.json({ success: false, error: "Укажите тег для удаления" }, { status: 400 });
    }

    const targetLower = tagToDelete.toLowerCase();
    const snippets = await prisma.snippet.findMany({
      where: { tags: { contains: tagToDelete } },
      select: { id: true, tags: true },
    });

    let updatedCount = 0;

    for (const s of snippets) {
      const parts = s.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const filtered = parts.filter((t) => t.toLowerCase() !== targetLower);

      if (filtered.length !== parts.length) {
        await prisma.snippet.update({
          where: { id: s.id },
          data: { tags: filtered.join(", ") },
        });
        updatedCount++;
      }
    }

    await logAuditEvent({
      event: "SETTINGS_CHANGE",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      details: `Удален тег "${tagToDelete}" из ${updatedCount} сниппетов`,
      request,
    });

    notifyDataChange("snippets");
    notifyDataChange("tags");

    return NextResponse.json({
      success: true,
      message: `Тег "${tagToDelete}" удален из ${updatedCount} сниппетов`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Admin delete tag error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка удаления тега" },
      { status: 500 }
    );
  }
}
