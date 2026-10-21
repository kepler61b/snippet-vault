import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectLanguageFromFilename } from "@/lib/languages";
import { ensureSeedSnippets } from "@/lib/seed";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await ensureSeedSnippets();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const tag = searchParams.get("tag")?.trim().toLowerCase();
    const language = searchParams.get("language")?.trim().toLowerCase();
    const favorite = searchParams.get("favorite") === "true";
    const visibility = searchParams.get("visibility"); // "PUBLIC", "UNLISTED", "PRIVATE"
    const collectionId = searchParams.get("collectionId");

    const where: any = {};

    if (favorite) {
      where.isFavorite = true;
    }

    if (collectionId) {
      where.collectionId = collectionId;
    }

    if (visibility && ["PUBLIC", "UNLISTED", "PRIVATE"].includes(visibility)) {
      where.visibility = visibility;
    }

    if (tag) {
      where.tags = {
        contains: tag,
      };
    }

    if (language) {
      where.files = {
        some: {
          language: language,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
        {
          files: {
            some: {
              OR: [
                { filename: { contains: search } },
                { content: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    const snippets = await prisma.snippet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        collection: true,
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, snippets });
  } catch (error: any) {
    console.error("Error fetching snippets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch snippets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, visibility, isFavorite, tags, files, collectionId } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one file is required" },
        { status: 400 }
      );
    }

    const formattedTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean).join(", ")
      : typeof tags === "string"
      ? tags.trim()
      : "";

    const currentUser = await getCurrentUser();

    const created = await prisma.snippet.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        visibility: ["PUBLIC", "UNLISTED", "PRIVATE"].includes(visibility)
          ? visibility
          : "PUBLIC",
        isFavorite: Boolean(isFavorite),
        tags: formattedTags,
        userId: currentUser?.id || null,
        collectionId: collectionId || null,
        files: {
          create: files.map((file: any, index: number) => {
            const filename = (file.filename || `snippet-${index + 1}`).trim();
            const language =
              file.language?.trim() || detectLanguageFromFilename(filename);
            return {
              filename,
              language,
              content: file.content || "",
              order: index,
            };
          }),
        },
      },
      include: {
        collection: true,
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, snippet: created }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating snippet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create snippet" },
      { status: 500 }
    );
  }
}
