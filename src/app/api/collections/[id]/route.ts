import { NextRequest, NextResponse } from "next/server";
import { notifyDataChange } from "@/lib/sync-events";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getAllDescendantCollectionIds,
  getSmartCollectionSnippetCount,
  wouldCauseCycle,
} from "@/lib/collections";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { name, description, iconType, iconValue, color, parentId, isSmart, filterRule } = body;

    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Коллекция не найдена" },
        { status: 404 }
      );
    }

    // Verify parentId and prevent cycle
    let resolvedParentId = existing.parentId;
    if (parentId !== undefined) {
      if (parentId === null || parentId === "" || parentId === "none") {
        resolvedParentId = null;
      } else {
        const isCycle = await wouldCauseCycle(id, parentId);
        if (isCycle) {
          return NextResponse.json(
            { success: false, error: "Нельзя переместить папку внутрь самой себя или её подпапок" },
            { status: 400 }
          );
        }
        const parent = await prisma.collection.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          return NextResponse.json(
            { success: false, error: "Родительская коллекция не найдена" },
            { status: 400 }
          );
        }
        resolvedParentId = parent.id;
      }
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(iconType !== undefined && { iconType }),
        ...(iconValue !== undefined && { iconValue }),
        ...(color !== undefined && { color }),
        parentId: resolvedParentId,
        ...(isSmart !== undefined && { isSmart: Boolean(isSmart) }),
        ...(filterRule !== undefined && {
          filterRule: filterRule ? (typeof filterRule === "string" ? filterRule : JSON.stringify(filterRule)) : null,
        }),
      },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

    if (updated.isSmart && updated.filterRule) {
      const smartCount = await getSmartCollectionSnippetCount(
        updated.filterRule,
        currentUser?.id
      );
      updated._count = { snippets: smartCount };
    }

    notifyDataChange("collections", { action: "updated" });

    return NextResponse.json({ success: true, collection: updated });
  } catch (error: any) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update collection" },
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

    // Find collection and all its subcollections
    const allCollectionIds = await getAllDescendantCollectionIds(id);

    // Disconnect snippets in this collection and all its descendants
    await prisma.snippet.updateMany({
      where: { collectionId: { in: allCollectionIds } },
      data: { collectionId: null },
    });

    // Delete subcollections and target collection
    await prisma.collection.deleteMany({
      where: { id: { in: allCollectionIds } },
    });

    notifyDataChange("collections", { action: "deleted" });
    notifyDataChange("snippets", { action: "updated" });

    return NextResponse.json({
      success: true,
      message: "Коллекция и вложенные папки удалены",
      deletedCount: allCollectionIds.length,
    });
  } catch (error: any) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete collection" },
      { status: 500 }
    );
  }
}
