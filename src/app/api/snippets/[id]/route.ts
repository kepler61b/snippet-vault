import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { detectLanguageFromFilename } from "@/lib/languages";
import { indexSnippet, ensureFtsInitialized } from "@/lib/fts";
import { notifyDataChange } from "@/lib/sync-events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const snippet = await prisma.snippet.findUnique({
      where: { id },
      include: {
        collection: true,
        files: { orderBy: { order: "asc" } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!snippet) {
      return NextResponse.json({ success: false, error: "Snippet not found" }, { status: 404 });
    }

    if (snippet.userId && snippet.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, snippet });
  } catch (error: any) {
    console.error("GET snippet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch snippet" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.snippet.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Snippet not found" }, { status: 404 });
    }

    if (existing.userId && existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, description, tags, isFavorite, collectionId, files } = body;

    // Save previous revision
    try {
      await prisma.snippetRevision.create({
        data: {
          snippetId: existing.id,
          title: existing.title,
          description: existing.description,
          tags: existing.tags,
          filesJson: JSON.stringify(
            existing.files.map((f) => ({
              filename: f.filename,
              language: f.language,
              content: f.content,
              order: f.order,
            }))
          ),
        },
      });
    } catch (e) {
      console.warn("Failed to create snippet revision:", e);
    }

    // Update snippet
    const formattedTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean).join(", ")
      : typeof tags === "string"
      ? tags
      : existing.tags;

    // Transaction to update snippet and replace files if provided
    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(files)) {
        await tx.snippetFile.deleteMany({ where: { snippetId: id } });
        await tx.snippetFile.createMany({
          data: files.map((file: any, index: number) => {
            const filename = (file.filename || `snippet-${index + 1}`).trim();
            const language = file.language?.trim() || detectLanguageFromFilename(filename);
            return {
              snippetId: id,
              filename,
              language,
              content: file.content || "",
              order: index,
            };
          }),
        });
      }

      return tx.snippet.update({
        where: { id },
        data: {
          title: typeof title === "string" ? title.trim() : existing.title,
          description: typeof description !== "undefined" ? (description?.trim() || null) : existing.description,
          tags: formattedTags,
          isFavorite: typeof isFavorite === "boolean" ? isFavorite : existing.isFavorite,
          collectionId: typeof collectionId !== "undefined" ? (collectionId || null) : existing.collectionId,
        },
        include: {
          collection: true,
          files: { orderBy: { order: "asc" } },
        },
      });
    });

    try {
      await ensureFtsInitialized();
      await indexSnippet(updated.id, updated);
    } catch {}

    notifyDataChange("snippets", { userId: user.id, action: "updated" });

    return NextResponse.json({ success: true, snippet: updated });
  } catch (error: any) {
    console.error("PUT snippet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update snippet" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.snippet.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Snippet not found" }, { status: 404 });
    }

    if (existing.userId && existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.snippet.delete({ where: { id } });

    notifyDataChange("snippets", { userId: user.id, action: "deleted" });

    return NextResponse.json({ success: true, message: "Snippet deleted" });
  } catch (error: any) {
    console.error("DELETE snippet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete snippet" },
      { status: 500 }
    );
  }
}
