import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const sourceTag = body.sourceTag?.trim();
    const targetTag = body.targetTag?.trim();

    if (!sourceTag || !targetTag) {
      return NextResponse.json(
        { success: false, error: "sourceTag and targetTag are required" },
        { status: 400 }
      );
    }

    if (sourceTag.toLowerCase() === targetTag.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Source and target tag cannot be identical" },
        { status: 400 }
      );
    }

    const snippets = await prisma.snippet.findMany({
      where: {
        tags: {
          contains: sourceTag,
        },
      },
      select: { id: true, tags: true },
    });

    let updatedSnippets = 0;
    const lowerSource = sourceTag.toLowerCase();

    for (const snippet of snippets) {
      const parts = snippet.tags.split(",").map((t) => t.trim()).filter(Boolean);
      let changed = false;

      const newParts: string[] = [];
      let hasTarget = false;

      for (const t of parts) {
        if (t.toLowerCase() === lowerSource) {
          changed = true;
          if (!hasTarget) {
            newParts.push(targetTag);
            hasTarget = true;
          }
        } else if (t.toLowerCase() === targetTag.toLowerCase()) {
          if (!hasTarget) {
            newParts.push(t);
            hasTarget = true;
          }
        } else {
          newParts.push(t);
        }
      }

      if (changed) {
        await prisma.snippet.update({
          where: { id: snippet.id },
          data: { tags: newParts.join(", ") },
        });
        updatedSnippets++;
      }
    }

    return NextResponse.json({ success: true, updatedSnippets });
  } catch (error: any) {
    console.error("POST merge tags error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to merge tags" },
      { status: 500 }
    );
  }
}
