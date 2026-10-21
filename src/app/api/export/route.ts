import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

      const exportPayload = {
        $schema: "https://snippetvault.local/schema/backup-v1.json",
        version: 1,
        appName: "SnippetVault",
        exportedAt: now.toISOString(),
        type: "snippet",
        collections: snippet.collection
          ? [
              {
                name: snippet.collection.name,
                description: snippet.collection.description,
                iconType: snippet.collection.iconType,
                iconValue: snippet.collection.iconValue,
                color: snippet.collection.color,
              },
            ]
          : [],
        snippets: [
          {
            title: snippet.title,
            description: snippet.description,
            visibility: snippet.visibility,
            isFavorite: snippet.isFavorite,
            tags: snippet.tags,
            collectionName: snippet.collection?.name || null,
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

    if (type === "collection") {
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: "Не указан ID коллекции для экспорта" },
          { status: 400 }
        );
      }

      const collection = await prisma.collection.findFirst({
        where: { id: targetId, userId: user.id },
      });

      if (!collection) {
        return NextResponse.json(
          { success: false, error: "Коллекция не найдена" },
          { status: 404 }
        );
      }

      const snippets = await prisma.snippet.findMany({
        where: { collectionId: targetId, userId: user.id },
        include: {
          files: { orderBy: { order: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      const exportPayload = {
        $schema: "https://snippetvault.local/schema/backup-v1.json",
        version: 1,
        appName: "SnippetVault",
        exportedAt: now.toISOString(),
        type: "collection",
        collections: [
          {
            name: collection.name,
            description: collection.description,
            iconType: collection.iconType,
            iconValue: collection.iconValue,
            color: collection.color,
          },
        ],
        snippets: snippets.map((s) => ({
          title: s.title,
          description: s.description,
          visibility: s.visibility,
          isFavorite: s.isFavorite,
          tags: s.tags,
          collectionName: collection.name,
          files: s.files.map((f) => ({
            filename: f.filename,
            language: f.language,
            content: f.content,
            order: f.order,
          })),
        })),
      };

      const safeName = (collection.name || "collection")
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

    // Full export ("all")
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      select: {
        name: true,
        description: true,
        iconType: true,
        iconValue: true,
        color: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const snippets = await prisma.snippet.findMany({
      where: { userId: user.id },
      include: {
        collection: { select: { name: true } },
        files: {
          orderBy: { order: "asc" },
          select: { filename: true, language: true, content: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportPayload = {
      $schema: "https://snippetvault.local/schema/backup-v1.json",
      version: 1,
      appName: "SnippetVault",
      exportedAt: now.toISOString(),
      type: "all",
      user: {
        email: user.email,
        name: user.name,
      },
      collections,
      snippets: snippets.map((s) => ({
        title: s.title,
        description: s.description,
        visibility: s.visibility,
        isFavorite: s.isFavorite,
        tags: s.tags,
        collectionName: s.collection?.name || null,
        files: s.files.map((f) => ({
          filename: f.filename,
          language: f.language,
          content: f.content,
          order: f.order,
        })),
      })),
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
