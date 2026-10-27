import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rebuildFtsIndex } from "@/lib/fts";
import { notifyDataChange } from "@/lib/sync-events";
import { getCollectionBreadcrumbPath } from "@/lib/collections";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Некорректный JSON файл для импорта" },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { success: false, error: "Файл резервной копии пуст или поврежден" },
        { status: 400 }
      );
    }

    // 1. Normalize snippets and collections arrays
    let incomingCollections: any[] = [];
    let incomingSnippets: any[] = [];

    if (Array.isArray(payload)) {
      // Direct array of snippets
      incomingSnippets = payload;
    } else if (payload.snippets && Array.isArray(payload.snippets)) {
      incomingSnippets = payload.snippets;
      if (payload.collections && Array.isArray(payload.collections)) {
        incomingCollections = payload.collections;
      }
    } else if (payload.title && (payload.files || payload.content || payload.code)) {
      // Single snippet object
      incomingSnippets = [payload];
      if (payload.collections && Array.isArray(payload.collections)) {
        incomingCollections = payload.collections;
      }
    } else if (payload.collections && Array.isArray(payload.collections) && !payload.snippets) {
      // Pure collections backup
      incomingCollections = payload.collections;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Формат файла не распознан. Ожидается экспорт SnippetVault с массивом сниппетов или коллекций.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch existing collections of this user
    const existingCollections = await prisma.collection.findMany({
      where: { userId: user.id },
    });

    const existingColMap = new Map(
      existingCollections.map((c) => [c.id, { id: c.id, name: c.name, parentId: c.parentId }])
    );

    // Build lookup maps for existing collections
    const existingByPath = new Map<string, string>();
    const existingByName = new Map<string, string>();
    const existingSmartByName = new Map<string, string>();

    for (const c of existingCollections) {
      const path = getCollectionBreadcrumbPath(c.id, existingColMap).toLowerCase();
      existingByPath.set(path, c.id);
      existingByName.set(c.name.trim().toLowerCase(), c.id);
      if (c.isSmart) {
        existingSmartByName.set(c.name.trim().toLowerCase(), c.id);
      }
    }

    // Mappings for incoming collections to DB IDs:
    const idMap = new Map<string, string>();
    const pathMap = new Map<string, string>(existingByPath);
    const nameMap = new Map<string, string>(existingByName);

    let importedCollectionsCount = 0;

    // 3. Process incoming collections with hierarchy depth resolution
    const validIncomingCollections = incomingCollections.filter(
      (c) => c && typeof c === "object" && typeof c.name === "string" && c.name.trim()
    );

    // Compute depth for topological sorting (roots first, then children, etc.)
    const incomingColMap = new Map<string, any>();
    validIncomingCollections.forEach((c) => {
      if (c.id) incomingColMap.set(c.id, c);
    });

    const getDepth = (col: any, visited = new Set<string>()): number => {
      if (!col.parentId || !incomingColMap.has(col.parentId)) return 0;
      if (visited.has(col.id)) return 0; // prevent cycle
      visited.add(col.id);
      return 1 + getDepth(incomingColMap.get(col.parentId), visited);
    };

    const sortedCollections = [...validIncomingCollections].sort((a, b) => {
      const depthA = a.isSmart ? 0 : getDepth(a);
      const depthB = b.isSmart ? 0 : getDepth(b);
      return depthA - depthB;
    });

    // Create / Merge collections level-by-level
    for (const col of sortedCollections) {
      const cleanName = col.name.trim();
      const isSmart = Boolean(col.isSmart);

      // Determine parent DB ID
      let targetDbParentId: string | null = null;
      if (!isSmart) {
        if (col.parentId && idMap.has(col.parentId)) {
          targetDbParentId = idMap.get(col.parentId)!;
        } else if (col.parentPath && pathMap.has(col.parentPath.toLowerCase())) {
          targetDbParentId = pathMap.get(col.parentPath.toLowerCase())!;
        } else if (col.parentName && nameMap.has(col.parentName.toLowerCase())) {
          targetDbParentId = nameMap.get(col.parentName.toLowerCase())!;
        } else if (col.parent?.name && nameMap.has(col.parent.name.toLowerCase())) {
          targetDbParentId = nameMap.get(col.parent.name.toLowerCase())!;
        }
      }

      // Compute intended full path
      let intendedPath = cleanName;
      if (col.path && typeof col.path === "string") {
        intendedPath = col.path.trim();
      } else if (targetDbParentId) {
        const parentCol = existingColMap.get(targetDbParentId);
        if (parentCol) {
          intendedPath = `${getCollectionBreadcrumbPath(targetDbParentId, existingColMap)} / ${cleanName}`;
        }
      }

      const intendedPathKey = intendedPath.toLowerCase();

      // Check if this collection already exists in DB
      let matchedExistingId: string | null = null;
      if (isSmart) {
        matchedExistingId = existingSmartByName.get(cleanName.toLowerCase()) || null;
      } else {
        matchedExistingId = pathMap.get(intendedPathKey) || null;
      }

      if (matchedExistingId) {
        // Collection already exists -> reuse it and update smart rule / metadata if needed
        if (col.id) idMap.set(col.id, matchedExistingId);
        pathMap.set(intendedPathKey, matchedExistingId);
        nameMap.set(cleanName.toLowerCase(), matchedExistingId);

        try {
          await prisma.collection.update({
            where: { id: matchedExistingId },
            data: {
              description: col.description?.trim() || undefined,
              iconType: col.iconType || undefined,
              iconValue: col.iconValue || undefined,
              color: col.color || undefined,
              isSmart,
              filterRule: col.filterRule
                ? (typeof col.filterRule === "string" ? col.filterRule : JSON.stringify(col.filterRule))
                : undefined,
            },
          });
        } catch (e) {
          console.warn("Could not update existing collection during import:", e);
        }
      } else {
        // Collection does not exist -> create it in the database
        try {
          const created = await prisma.collection.create({
            data: {
              userId: user.id,
              name: cleanName,
              description: col.description?.trim() || null,
              iconType: col.iconType || (isSmart ? "lucide" : "lucide"),
              iconValue: col.iconValue || (isSmart ? "Sparkles" : "Folder"),
              color: col.color || (isSmart ? "#ec4899" : "#8b5cf6"),
              parentId: isSmart ? null : targetDbParentId,
              isSmart,
              filterRule: col.filterRule
                ? (typeof col.filterRule === "string" ? col.filterRule : JSON.stringify(col.filterRule))
                : null,
            },
          });

          // Register created collection into lookup structures
          existingColMap.set(created.id, {
            id: created.id,
            name: created.name,
            parentId: created.parentId,
          });

          if (col.id) idMap.set(col.id, created.id);
          pathMap.set(intendedPathKey, created.id);
          nameMap.set(cleanName.toLowerCase(), created.id);
          if (isSmart) {
            existingSmartByName.set(cleanName.toLowerCase(), created.id);
          }

          importedCollectionsCount++;
        } catch (err) {
          console.warn("Error creating collection during import:", err);
        }
      }
    }

    // 4. Import snippets
    let importedSnippetsCount = 0;

    for (const snip of incomingSnippets) {
      if (!snip || typeof snip !== "object") continue;

      const title = (snip.title && String(snip.title).trim()) || "Импортированный сниппет";
      const description = snip.description ? String(snip.description).trim() : null;
      const visibility = (snip.visibility && ["PUBLIC", "UNLISTED", "PRIVATE"].includes(snip.visibility))
        ? snip.visibility
        : "PUBLIC";
      const isFavorite = Boolean(snip.isFavorite);
      const tags =
        typeof snip.tags === "string"
          ? snip.tags
          : Array.isArray(snip.tags)
          ? snip.tags.join(", ")
          : "";

      // Determine target collection ID
      let targetCollectionId: string | null = null;

      if (snip.collectionId && idMap.has(snip.collectionId)) {
        targetCollectionId = idMap.get(snip.collectionId)!;
      } else if (snip.collectionPath && pathMap.has(snip.collectionPath.toLowerCase())) {
        targetCollectionId = pathMap.get(snip.collectionPath.toLowerCase())!;
      } else if (snip.collectionName && typeof snip.collectionName === "string" && snip.collectionName.trim()) {
        const normColName = snip.collectionName.trim().toLowerCase();
        if (nameMap.has(normColName)) {
          targetCollectionId = nameMap.get(normColName)!;
        } else {
          // Auto-create collection if not yet created
          try {
            const created = await prisma.collection.create({
              data: {
                userId: user.id,
                name: snip.collectionName.trim(),
                iconType: "lucide",
                iconValue: "Folder",
                color: "#8b5cf6",
              },
            });
            existingColMap.set(created.id, { id: created.id, name: created.name, parentId: null });
            nameMap.set(normColName, created.id);
            pathMap.set(normColName, created.id);
            targetCollectionId = created.id;
            importedCollectionsCount++;
          } catch (e) {
            console.warn("Auto-create collection error:", e);
          }
        }
      }

      // Determine files
      let filesToCreate: { filename: string; language: string; content: string; order: number }[] = [];

      if (Array.isArray(snip.files) && snip.files.length > 0) {
        filesToCreate = snip.files.map((f: any, idx: number) => ({
          filename: (f.filename && String(f.filename).trim()) || `file-${idx + 1}.txt`,
          language: (f.language && String(f.language).trim()) || "plaintext",
          content: typeof f.content === "string" ? f.content : "",
          order: typeof f.order === "number" ? f.order : idx,
        }));
      } else if (typeof snip.content === "string" || typeof snip.code === "string") {
        filesToCreate = [
          {
            filename: (snip.filename && String(snip.filename).trim()) || "main.txt",
            language: (snip.language && String(snip.language).trim()) || "plaintext",
            content: typeof snip.content === "string" ? snip.content : snip.code || "",
            order: 0,
          },
        ];
      } else {
        filesToCreate = [
          {
            filename: "code.txt",
            language: "plaintext",
            content: "",
            order: 0,
          },
        ];
      }

      try {
        await prisma.snippet.create({
          data: {
            userId: user.id,
            title,
            description,
            visibility,
            isFavorite,
            tags,
            collectionId: targetCollectionId,
            files: {
              create: filesToCreate,
            },
          },
        });
        importedSnippetsCount++;
      } catch (err) {
        console.warn("Error creating snippet during import:", err);
      }
    }

    // 5. Rebuild search index & trigger real-time live sync
    if (importedSnippetsCount > 0) {
      await rebuildFtsIndex();
    }

    notifyDataChange("collections", { userId: user.id });
    notifyDataChange("snippets", { userId: user.id });
    notifyDataChange("tags", { userId: user.id });

    return NextResponse.json({
      success: true,
      message: `Импорт завершен: успешно восстановлено ${importedSnippetsCount} ${
        importedSnippetsCount === 1 ? "сниппет" : importedSnippetsCount < 5 ? "сниппета" : "сниппетов"
      }${
        importedCollectionsCount > 0
          ? ` и ${importedCollectionsCount} ${
              importedCollectionsCount === 1 ? "коллекция" : "коллекций"
            }`
          : ""
      }. Вся вложенность папок и умные коллекции сохранены.`,
      importedSnippets: importedSnippetsCount,
      importedCollections: importedCollectionsCount,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка импорта данных" },
      { status: 500 }
    );
  }
}
