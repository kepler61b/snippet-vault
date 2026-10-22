import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const revisions = await prisma.snippetRevision.findMany({
      where: { snippetId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const parsed = revisions.map((rev) => {
      let files = [];
      try {
        files = JSON.parse(rev.filesJson);
      } catch {}
      return {
        id: rev.id,
        snippetId: rev.snippetId,
        title: rev.title,
        description: rev.description,
        tags: rev.tags,
        createdAt: rev.createdAt,
        files,
        filesCount: files.length,
      };
    });

    return NextResponse.json({ success: true, revisions: parsed });
  } catch (error: any) {
    console.error("Error fetching revisions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch revisions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { revisionId } = body;

    if (!revisionId) {
      return NextResponse.json(
        { success: false, error: "revisionId is required" },
        { status: 400 }
      );
    }

    const revision = await prisma.snippetRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision || revision.snippetId !== id) {
      return NextResponse.json(
        { success: false, error: "Revision not found" },
        { status: 404 }
      );
    }

    const currentSnippet = await prisma.snippet.findUnique({
      where: { id },
      include: {
        files: { orderBy: { order: "asc" } },
      },
    });

    if (!currentSnippet) {
      return NextResponse.json(
        { success: false, error: "Snippet not found" },
        { status: 404 }
      );
    }

    let restoredFiles: any[] = [];
    try {
      restoredFiles = JSON.parse(revision.filesJson);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse revision files" },
        { status: 500 }
      );
    }

    // Transaction: Snapshot current state before restoring, then apply revision files and metadata
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Snapshot current state before restore
      if (currentSnippet.files && currentSnippet.files.length > 0) {
        await tx.snippetRevision.create({
          data: {
            snippetId: id,
            title: currentSnippet.title,
            description: currentSnippet.description,
            tags: currentSnippet.tags,
            filesJson: JSON.stringify(
              currentSnippet.files.map((f) => ({
                filename: f.filename,
                language: f.language,
                content: f.content,
                order: f.order,
              }))
            ),
          },
        });
      }

      // 2. Replace current files with restored files
      await tx.snippetFile.deleteMany({
        where: { snippetId: id },
      });

      await tx.snippetFile.createMany({
        data: restoredFiles.map((f: any, idx: number) => ({
          snippetId: id,
          filename: f.filename || `file-${idx + 1}`,
          language: f.language || "plaintext",
          content: f.content || "",
          order: typeof f.order === "number" ? f.order : idx,
        })),
      });

      // 3. Update snippet title, description, tags
      return tx.snippet.update({
        where: { id },
        data: {
          title: revision.title,
          description: revision.description,
          tags: revision.tags,
        },
        include: {
          collection: true,
          files: { orderBy: { order: "asc" } },
        },
      });
    });

    return NextResponse.json({ success: true, snippet: updated });
  } catch (error: any) {
    console.error("Error restoring revision:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore revision" },
      { status: 500 }
    );
  }
}
