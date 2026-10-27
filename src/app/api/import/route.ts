import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rebuildFtsIndex } from "@/lib/fts";

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

    // Normalize snippets and collections arrays
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
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Формат файла не распознан. Ожидается экспорт SnippetVault с массивом сниппетов.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch user's existing collections
    const existingCollections = await prisma.collection.findMany({
      where: { userId: user.id },
    });

    const collectionMap = new Map<string, string>();
    existingCollections.forEach((c) => {
      collectionMap.set(c.name.trim().toLowerCase(), c.id);
    });

    let importedCollectionsCount = 0;

    // 2. Import / merge collections
    for (const col of incomingCollections) {
      if (!col || typeof col.name !== "string" || !col.name.trim()) continue;

      const normName = col.name.trim().toLowerCase();
      if (!collectionMap.has(normName)) {
        try {
          const created = await prisma.collection.create({
            data: {
              userId: user.id,
              name: col.name.trim(),
              description: col.description?.trim() || null,
              iconType: col.iconType || "lucide",
              iconValue: col.iconValue || "Folder",
              color: col.color || "#8b5cf6",
              isSmart: Boolean(col.isSmart),
              filterRule: col.filterRule ? (typeof col.filterRule === "string" ? col.filterRule : JSON.stringify(col.filterRule)) : null,
            },
          });
          collectionMap.set(normName, created.id);
          importedCollectionsCount++;
        } catch (e) {
          console.warn("Error creating collection during import:", e);
        }
      }
    }

    // 3. Import snippets
    let importedSnippetsCount = 0;

    for (const snip of incomingSnippets) {
      if (!snip || typeof snip !== "object") continue;

      const title = (snip.title && String(snip.title).trim()) || "Импортированный сниппет";
      const description = snip.description ? String(snip.description).trim() : null;
      const visibility = "UNLISTED";
      const isFavorite = Boolean(snip.isFavorite);
      const tags =
        typeof snip.tags === "string"
          ? snip.tags
          : Array.isArray(snip.tags)
          ? snip.tags.join(", ")
          : "";

      // Determine collection ID
      let targetCollectionId: string | null = null;
      if (snip.collectionName && typeof snip.collectionName === "string" && snip.collectionName.trim()) {
        const normColName = snip.collectionName.trim().toLowerCase();
        if (collectionMap.has(normColName)) {
          targetCollectionId = collectionMap.get(normColName)!;
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
            collectionMap.set(normColName, created.id);
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

    if (importedSnippetsCount > 0) {
      await rebuildFtsIndex();
    }

    return NextResponse.json({
      success: true,
      message: `Импорт завершен: восстановлено ${importedSnippetsCount} ${
        importedSnippetsCount === 1 ? "сниппет" : importedSnippetsCount < 5 ? "сниппета" : "сниппетов"
      }${
        importedCollectionsCount > 0
          ? ` и ${importedCollectionsCount} ${
              importedCollectionsCount === 1 ? "коллекция" : "коллекций"
            }`
          : ""
      }.`,
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
