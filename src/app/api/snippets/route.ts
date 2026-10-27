import { NextRequest, NextResponse } from "next/server";
import { notifyDataChange } from "@/lib/sync-events";
import { prisma } from "@/lib/db";
import { detectLanguageFromFilename } from "@/lib/languages";
import { ensureSeedSnippets } from "@/lib/seed";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureFtsInitialized,
  searchFts,
  extractLineMatches,
  indexSnippet,
} from "@/lib/fts";
import {
  getAllDescendantCollectionIds,
  buildSmartCollectionWhere,
} from "@/lib/collections";
import { SmartFilterRule } from "@/types/snippet";
import {
  logIntegrationActivity,
  detectIntegrationClient,
  extractClientIp,
  extractTokenPrefix,
} from "@/lib/integration-log";

export async function GET(request: NextRequest) {
  try {
    await ensureSeedSnippets();
    await ensureFtsInitialized();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const tag = searchParams.get("tag")?.trim().toLowerCase();
    const language = searchParams.get("language")?.trim().toLowerCase();
    const favorite = searchParams.get("favorite") === "true";
    const collectionId = searchParams.get("collectionId");

    const where: any = {};
    const andConditions: any[] = [];

    // User access filter
    if (currentUser) {
      andConditions.push({
        OR: [{ userId: currentUser.id }, { userId: null }],
      });
    }

    if (favorite) {
      where.isFavorite = true;
    }

    // Collection filter (nested folder or smart collection)
    if (collectionId) {
      const targetCol = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (targetCol?.isSmart && targetCol.filterRule) {
        try {
          const rule: SmartFilterRule = JSON.parse(targetCol.filterRule);
          const smartConditions = buildSmartCollectionWhere(rule);
          if (smartConditions.length > 0) {
            andConditions.push(...smartConditions);
          }
        } catch (e) {
          console.warn("Error parsing smart collection rule:", e);
        }
      } else {
        // Nested collection: include this folder and all its descendants
        const allDescendantIds = await getAllDescendantCollectionIds(
          collectionId,
          currentUser?.id
        );
        where.collectionId = { in: allDescendantIds };
      }
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

    let ftsResultMap = new Map<string, { rank: number; snippetText?: string }>();

    // Full-Text Search
    if (search) {
      ftsResultMap = await searchFts(search);
      const ftsSnippetIds = Array.from(ftsResultMap.keys());

      const searchTermsLower = search.toLowerCase();
      const standardSearchCondition = {
        OR: [
          { title: { contains: searchTermsLower } },
          { description: { contains: searchTermsLower } },
          { tags: { contains: searchTermsLower } },
          {
            files: {
              some: {
                OR: [
                  { filename: { contains: searchTermsLower } },
                  { content: { contains: searchTermsLower } },
                ],
              },
            },
          },
        ],
      };

      if (ftsSnippetIds.length > 0) {
        andConditions.push({
          OR: [
            { id: { in: ftsSnippetIds } },
            standardSearchCondition,
          ],
        });
      } else {
        andConditions.push(standardSearchCondition);
      }
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

    // Attach FTS line matches and highlights
    const enrichedSnippets = snippets.map((s) => {
      let matches = undefined;
      let highlightedSnippet = undefined;

      if (search) {
        matches = extractLineMatches(s.files, search, 3);
        const ftsData = ftsResultMap.get(s.id);
        if (ftsData?.snippetText) {
          highlightedSnippet = ftsData.snippetText;
        }
      }

      return {
        ...s,
        matches,
        highlightedSnippet,
      };
    });

    // If search was performed, sort by FTS rank
    if (search && ftsResultMap.size > 0) {
      enrichedSnippets.sort((a, b) => {
        const rankA = ftsResultMap.get(a.id)?.rank ?? 999;
        const rankB = ftsResultMap.get(b.id)?.rank ?? 999;
        return rankA - rankB;
      });
    }

    const hasAuthHeader = Boolean(
      request.headers.get("authorization") || request.headers.get("x-api-key")
    );
    if (hasAuthHeader) {
      logIntegrationActivity({
        client: detectIntegrationClient(request),
        action: search ? `Поиск ("${search}")` : "Список сниппетов",
        method: "GET",
        path: "/api/snippets",
        status: 200,
        details: `Найдено: ${enrichedSnippets.length}`,
        userId: currentUser?.id,
        tokenPrefix: extractTokenPrefix(request),
        ip: extractClientIp(request),
        userAgent: request.headers.get("user-agent"),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, snippets: enrichedSnippets });
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

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Index into FTS5
    await indexSnippet(created.id, created);

    const hasAuthHeader = Boolean(
      request.headers.get("authorization") || request.headers.get("x-api-key")
    );
    if (hasAuthHeader) {
      logIntegrationActivity({
        client: detectIntegrationClient(request),
        action: `Создание: "${created.title}"`,
        method: "POST",
        path: "/api/snippets",
        status: 201,
        details: `${created.files.length} файл(а/ов), теги: ${created.tags || "—"}`,
        userId: currentUser?.id,
        tokenPrefix: extractTokenPrefix(request),
        ip: extractClientIp(request),
        userAgent: request.headers.get("user-agent"),
      }).catch(() => {});
    }

    notifyDataChange("snippets", { userId: currentUser?.id, action: "created" });

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

      // Clear FTS index
      await prisma.$executeRawUnsafe(`DELETE FROM snippet_fts;`).catch(() => {});
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
