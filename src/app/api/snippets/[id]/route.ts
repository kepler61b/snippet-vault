import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectLanguageFromFilename } from "@/lib/languages";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snippet = await prisma.snippet.findUnique({
      where: { id },
      include: {
        collection: true,
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!snippet) {
      return NextResponse.json(
        { success: false, error: "Snippet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, snippet });
  } catch (error: any) {
    console.error("Error fetching snippet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch snippet" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, isFavorite, tags, files, collectionId } = body;

    const existing = await prisma.snippet.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Snippet not found" },
        { status: 404 }
      );
    }

    const formattedTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean).join(", ")
      : typeof tags === "string"
      ? tags.trim()
      : undefined;

    // Use a transaction to update snippet metadata and replace files
    const updated = await prisma.$transaction(async (tx) => {
      // Delete old files if new files provided
      if (Array.isArray(files) && files.length > 0) {
        await tx.snippetFile.deleteMany({
          where: { snippetId: id },
        });

        await tx.snippetFile.createMany({
          data: files.map((file: any, index: number) => {
            const filename = (file.filename || `snippet-${index + 1}`).trim();
            const language =
              file.language?.trim() || detectLanguageFromFilename(filename);
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
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(isFavorite !== undefined && { isFavorite: Boolean(isFavorite) }),
          ...(formattedTags !== undefined && { tags: formattedTags }),
          ...(collectionId !== undefined && { collectionId: collectionId || null }),
        },
        include: {
          collection: true,
          files: {
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ success: true, snippet: updated });
  } catch (error: any) {
    console.error("Error updating snippet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update snippet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete child files first to avoid foreign key constraint issues in SQLite
    await prisma.snippetFile.deleteMany({
      where: { snippetId: id },
    });

    await prisma.snippet.delete({
      where: { id },
    });

    // Ensure seed does not recreate snippets if count drops to 0
    await prisma.setting.upsert({
      where: { key: "seed_completed" },
      update: { value: "true" },
      create: { key: "seed_completed", value: "true" },
    });

    return NextResponse.json({ success: true, message: "Snippet deleted" });
  } catch (error: any) {
    console.error("Error deleting snippet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete snippet" },
      { status: 500 }
    );
  }
}
