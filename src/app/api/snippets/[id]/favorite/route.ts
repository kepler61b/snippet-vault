import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snippet = await prisma.snippet.findUnique({
      where: { id },
      select: { isFavorite: true },
    });

    if (!snippet) {
      return NextResponse.json(
        { success: false, error: "Snippet not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.snippet.update({
      where: { id },
      data: { isFavorite: !snippet.isFavorite },
      select: { id: true, isFavorite: true },
    });

    return NextResponse.json({ success: true, isFavorite: updated.isFavorite });
  } catch (error: any) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}
