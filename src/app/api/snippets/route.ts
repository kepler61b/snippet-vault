import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectLanguageFromFilename } from "@/lib/languages";
import { ensureSeedSnippets } from "@/lib/seed";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await ensureSeedSnippets();
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const tag = searchParams.get("tag")?.trim().toLowerCase();
    const language = searchParams.get("language")?.trim().toLowerCase();
    const favorite = searchParams.get("favorite") === "true";
    const collectionId = searchParams.get("collectionId");

    const where: any = {};
    const andConditions: any[] = [];

    // All snippets remain accessible within the single account
    if (currentUser) {
      andConditions.push({
        OR: [{ userId: currentUser.id }, { userId: null }],
      });
    }

    if (favorite) {
      where.isFavorite = true;
    }

    if (collectionId) {
      where.collectionId = collectionId;
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
      andConditions.push({
        OR: [
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
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
        visibility: "UNLISTED",
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

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find all snippets of this user (or unassigned/demo snippets)
    const snippets = await prisma.snippet.findMany({
      where: {
        OR: [{ userId: currentUser.id }, { userId: null }],
      },
      select: { id: true },
    });

    const ids = snippets.map((s) => s.id);

    if (ids.length > 0) {
      await prisma.snippetFile.deleteMany({
        where: { snippetId: { in: ids } },
      });
      await prisma.snippet.deleteMany({
        where: { id: { in: ids } },
      });
    }

    // Delete all custom collections of this user (or unassigned/demo collections)
    const deletedCollections = await prisma.collection.deleteMany({
      where: {
        OR: [{ userId: currentUser.id }, { userId: null }],
      },
    });

    // Mark seed as completed permanently so deleted snippets are never auto-recreated
    await prisma.setting.upsert({
      where: { key: "seed_completed" },
      update: { value: "true" },
      create: { key: "seed_completed", value: "true" },
    });

    return NextResponse.json({
      success: true,
      message: `База данных очищена: удалено сниппетов: ${ids.length}, коллекций: ${deletedCollections.count}.`,
      count: ids.length,
      deletedCollections: deletedCollections.count,
    });
  } catch (error: any) {
    console.error("Error clearing snippets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при очистке базы сниппетов" },
      { status: 500 }
    );
  }
}
