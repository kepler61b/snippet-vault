import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSmartCollectionSnippetCount } from "@/lib/collections";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const collections = await prisma.collection.findMany({
      where: currentUser
        ? {
            OR: [{ userId: currentUser.id }, { userId: null }],
          }
        : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

    // Compute dynamic snippet counts for smart collections
    const enrichedCollections = await Promise.all(
      collections.map(async (col) => {
        if (col.isSmart && col.filterRule) {
          const smartCount = await getSmartCollectionSnippetCount(
            col.filterRule,
            currentUser?.id
          );
          return {
            ...col,
            _count: { snippets: smartCount },
          };
        }
        return col;
      })
    );

    return NextResponse.json({ success: true, collections: enrichedCollections });
  } catch (error: any) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { name, description, iconType, iconValue, color, parentId, isSmart, filterRule } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Укажите название коллекции" },
        { status: 400 }
      );
    }

    // Verify parentId if specified
    let validParentId: string | null = null;
    if (parentId && typeof parentId === "string" && parentId.trim()) {
      const parent = await prisma.collection.findUnique({
        where: { id: parentId.trim() },
      });
      if (parent) {
        validParentId = parent.id;
      }
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        iconType: iconType === "custom_image" ? "custom_image" : "lucide",
        iconValue: iconValue || (isSmart ? "Sparkles" : "Folder"),
        color: color || (isSmart ? "#ec4899" : "#8b5cf6"),
        parentId: validParentId,
        isSmart: Boolean(isSmart),
        filterRule: filterRule ? (typeof filterRule === "string" ? filterRule : JSON.stringify(filterRule)) : null,
        userId: currentUser?.id || null,
      },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

    if (collection.isSmart && collection.filterRule) {
      const smartCount = await getSmartCollectionSnippetCount(
        collection.filterRule,
        currentUser?.id
      );
      collection._count = { snippets: smartCount };
    }

    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create collection" },
      { status: 500 }
    );
  }
}
