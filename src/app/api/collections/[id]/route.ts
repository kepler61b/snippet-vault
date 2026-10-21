import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, iconType, iconValue, color } = body;

    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Коллекция не найдена" },
        { status: 404 }
      );
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(iconType !== undefined && { iconType }),
        ...(iconValue !== undefined && { iconValue }),
        ...(color !== undefined && { color }),
      },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

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

    // Disconnect snippets in this collection first
    await prisma.snippet.updateMany({
      where: { collectionId: id },
      data: { collectionId: null },
    });

    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Коллекция удалена" });
  } catch (error: any) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete collection" },
      { status: 500 }
    );
  }
}
