import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyDataChange } from "@/lib/sync-events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.collection.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    if (existing.userId && existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, iconType, iconValue, color, parentId, isSmart, filterRule } = body;

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        name: typeof name === "string" ? name.trim() : existing.name,
        description: typeof description !== "undefined" ? (description?.trim() || null) : existing.description,
        iconType: iconType || existing.iconType,
        iconValue: iconValue || existing.iconValue,
        color: typeof color !== "undefined" ? color : existing.color,
        parentId: typeof parentId !== "undefined" ? (parentId || null) : existing.parentId,
        isSmart: typeof isSmart === "boolean" ? isSmart : existing.isSmart,
        filterRule: typeof filterRule !== "undefined" ? (typeof filterRule === "object" ? JSON.stringify(filterRule) : filterRule) : existing.filterRule,
      },
    });

    notifyDataChange("collections", { userId: user.id, action: "updated" });

    return NextResponse.json({ success: true, collection: updated });
  } catch (error: any) {
    console.error("PUT collection error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.collection.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    if (existing.userId && existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.collection.delete({ where: { id } });

    notifyDataChange("collections", { userId: user.id, action: "deleted" });

    return NextResponse.json({ success: true, message: "Collection deleted" });
  } catch (error: any) {
    console.error("DELETE collection error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete collection" },
      { status: 500 }
    );
  }
}
