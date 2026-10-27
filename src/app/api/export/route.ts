import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAllDescendantCollectionIds, getCollectionBreadcrumbPath } from "@/lib/collections";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // "all" | "collection" | "snippet"
    const targetId = searchParams.get("id");

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // 1. Single snippet export
    if (type === "snippet") {
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: "Не указан ID сниппета для экспорта" },
          { status: 400 }
        );
      }

      const snippet = await prisma.snippet.findFirst({
        where: { id: targetId, userId: user.id },
        include: {
          collection: true,
          files: { orderBy: { order: "asc" } },
        },
      });

      if (!snippet) {
        return NextResponse.json(
          { success: false, error: "Сниппет не найден" },
          { status: 404 }
        );
      }

      let collectionBreadcrumb: string | null = null;
      let exportedCollections: any[] = [];

      if (snippet.collection) {
        const userCols = await prisma.collection.findMany({
          where: { userId: user.id },
          select: { id: true, name: true, parentId: true },
        });
        const colMap = new Map(userCols.map((c) => [c.id, c]));
        collectionBreadcrumb = getCollectionBreadcrumbPath(snippet.collection.id, colMap);

        exportedCollections = [
          {
            id: snippet.collection.id,
            name: snippet.collection.name,
            description: snippet.collection.description,
            iconType: snippet.collection.iconType,
            iconValue: snippet.collection.iconValue,
            color: snippet.collection.color,
            parentId: snippet.collection.parentId,
            path: collectionBreadcrumb,
            isSmart: snippet.collection.isSmart,
            filterRule: snippet.collection.filterRule,
          },
        ];
      }

      const exportPayload = {
        $schema: "https://snippetvault.local/schema/backup-v2.json",
        version: 2,
        appName: "SnippetVault",
        exportedAt: now.toISOString(),
        type: "snippet",
        collections: exportedCollections,
        snippets: [
          {
            id: snippet.id,
            title: snippet.title,
            description: snippet.description,
            visibility: snippet.visibility,
            isFavorite: snippet.isFavorite,
            tags: snippet.tags,
            collectionId: snippet.collectionId,
            collectionName: snippet.collection?.name || null,
            collectionPath: collectionBreadcrumb,
            files: snippet.files.map((f) => ({
              filename: f.filename,
              language: f.language,
              content: f.content,
              order: f.order,
            })),
          },
        ],
      };

      const safeName = (snippet.title || "snippet")
        .trim()
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_");

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeName
          )}.snippetvault.json"`,
        },
      });
    }

    // 2. Collection export with all recursive nested subcollections
    if (type === "collection") {
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: "Не указан ID коллекции для экспорта" },
          { status: 400 }
        );
      }

      const rootCollection = await prisma.collection.findFirst({
        where: { id: targetId, userId: user.id },
      });

      if (!rootCollection) {
        return NextResponse.json(
          { success: false, error: "Коллекция не найдена" },
          { status: 404 }
        );
      }

      // Recursively fetch all descendant collection IDs (including root targetId)
      const allDescendantIds = await getAllDescendantCollectionIds(targetId, user.id);

      // Fetch all collections in the hierarchy
      const collections = await prisma.collection.findMany({
        where: { id: { in: allDescendantIds }, userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      // Build map for breadcrumb calculations relative to the exported tree
      const colMap = new Map(
        collections.map((c) => [c.id, { id: c.id, name: c.name, parentId: c.parentId }])
      );

      // Format collections: for the root collection, parentId is null in this standalone bundle
      const formattedCollections = collections.map((col) => {
        const fullPath = getCollectionBreadcrumbPath(col.id, colMap);
        const isRoot = col.id === targetId;
        const relativeParentId = isRoot ? null : col.parentId;
        const relativeParentPath =
          !isRoot && col.parentId ? getCollectionBreadcrumbPath(col.parentId, colMap) : null;

        return {
          id: col.id,
          name: col.name,
          description: col.description,
          iconType: col.iconType,
          iconValue: col.iconValue,
          color: col.color,
          parentId: relativeParentId,
          parentPath: relativeParentPath,
          path: fullPath,
          isSmart: col.isSmart,
          filterRule: col.filterRule,
          createdAt: col.createdAt.toISOString(),
          updatedAt: col.updatedAt.toISOString(),
        };
      });

      // Fetch all snippets across root collection and all its subcollections
      const snippets = await prisma.snippet.findMany({
        where: { collectionId: { in: allDescendantIds }, userId: user.id },
        include: {
          collection: { select: { id: true, name: true } },
          files: { orderBy: { order: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedSnippets = snippets.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        visibility: s.visibility,
        isFavorite: s.isFavorite,
        tags: s.tags,
        collectionId: s.collectionId,
        collectionName: s.collection?.name || null,
        collectionPath: s.collectionId ? getCollectionBreadcrumbPath(s.collectionId, colMap) : null,
        files: s.files.map((f) => ({
          filename: f.filename,
          language: f.language,
          content: f.content,
          order: f.order,
        })),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      const exportPayload = {
        $schema: "https://snippetvault.local/schema/backup-v2.json",
        version: 2,
        appName: "SnippetVault",
        exportedAt: now.toISOString(),
        type: "collection",
        rootCollectionId: targetId,
        rootCollectionName: rootCollection.name,
        totalCollections: formattedCollections.length,
        totalSnippets: formattedSnippets.length,
        collections: formattedCollections,
        snippets: formattedSnippets,
      };

      const safeName = (rootCollection.name || "collection")
        .trim()
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_");

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeName
          )}.collection.snippetvault.json"`,
        },
      });
    }

    // 3. Full database export ("all")
    // Fetch all user collections (standard folders + nested folders + smart collections)
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const colMap = new Map(
      collections.map((c) => [c.id, { id: c.id, name: c.name, parentId: c.parentId }])
    );

    const formattedCollections = collections.map((col) => {
      const fullPath = getCollectionBreadcrumbPath(col.id, colMap);
      const parentPath = col.parentId ? getCollectionBreadcrumbPath(col.parentId, colMap) : null;

      return {
        id: col.id,
        name: col.name,
        description: col.description,
        iconType: col.iconType,
        iconValue: col.iconValue,
        color: col.color,
        parentId: col.parentId,
        parentPath,
        path: fullPath,
        isSmart: col.isSmart,
        filterRule: col.filterRule,
        createdAt: col.createdAt.toISOString(),
        updatedAt: col.updatedAt.toISOString(),
      };
    });

    // Fetch all snippets (both in collections and uncategorized)
    const snippets = await prisma.snippet.findMany({
      where: { userId: user.id },
      include: {
        collection: { select: { id: true, name: true } },
        files: {
          orderBy: { order: "asc" },
          select: { filename: true, language: true, content: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedSnippets = snippets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      visibility: s.visibility,
      isFavorite: s.isFavorite,
      tags: s.tags,
      collectionId: s.collectionId,
      collectionName: s.collection?.name || null,
      collectionPath: s.collectionId ? getCollectionBreadcrumbPath(s.collectionId, colMap) : null,
      files: s.files.map((f) => ({
        filename: f.filename,
        language: f.language,
        content: f.content,
        order: f.order,
      })),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const exportPayload = {
      $schema: "https://snippetvault.local/schema/backup-v2.json",
      version: 2,
      appName: "SnippetVault",
      exportedAt: now.toISOString(),
      type: "all",
      user: {
        email: user.email,
        name: user.name,
      },
      totalCollections: formattedCollections.length,
      totalSnippets: formattedSnippets.length,
      collections: formattedCollections,
      snippets: formattedSnippets,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="snippetvault-backup-${dateStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка экспорта данных" },
      { status: 500 }
    );
  }
}
