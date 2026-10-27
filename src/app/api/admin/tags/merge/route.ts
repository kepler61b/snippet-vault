import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyDataChange } from "@/lib/sync-events";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const { sourceTag, targetTag } = body;

    const cleanSource = typeof sourceTag === "string" ? sourceTag.trim() : "";
    const cleanTarget = typeof targetTag === "string" ? targetTag.trim() : "";

    if (!cleanSource || !cleanTarget) {
      return NextResponse.json(
        { success: false, error: "Укажите исходный и целевой тег" },
        { status: 400 }
      );
    }

    if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Исходный и целевой тег не могут совпадать" },
        { status: 400 }
      );
    }

    const sourceLower = cleanSource.toLowerCase();

    // Find all snippets that might contain the source tag
    const snippets = await prisma.snippet.findMany({
      where: { tags: { contains: cleanSource } },
      select: { id: true, tags: true },
    });

    let updatedCount = 0;

    for (const s of snippets) {
      const parts = s.tags.split(",").map((t) => t.trim()).filter(Boolean);
      let changed = false;

      const newParts: string[] = [];
      const seen = new Set<string>();

      for (const t of parts) {
        const checkLower = t.toLowerCase();
        let finalTag = t;

        if (checkLower === sourceLower) {
          finalTag = cleanTarget;
          changed = true;
        }

        const finalLower = finalTag.toLowerCase();
        if (!seen.has(finalLower)) {
          seen.add(finalLower);
          newParts.push(finalTag);
        } else {
          changed = true; // Duplicate eliminated
        }
      }

      if (changed) {
        await prisma.snippet.update({
          where: { id: s.id },
          data: { tags: newParts.join(", ") },
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
      details: `Слияние тега "${cleanSource}" в "${cleanTarget}" (обновлено сниппетов: ${updatedCount})`,
      request,
    });

    notifyDataChange("snippets");
    notifyDataChange("tags");

    return NextResponse.json({
      success: true,
      message: `Слияние завершено: обновлено ${updatedCount} сниппетов`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Admin merge tags error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка слияния тегов" },
      { status: 500 }
    );
  }
}
