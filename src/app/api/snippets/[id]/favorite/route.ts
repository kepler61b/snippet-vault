import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyDataChange } from "@/lib/sync-events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.snippet.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Snippet not found" }, { status: 404 });
    }

    const updated = await prisma.snippet.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
      include: {
        collection: true,
        files: { orderBy: { order: "asc" } },
      },
    });

    notifyDataChange("snippets", { userId: user.id, action: "updated" });

    return NextResponse.json({ success: true, snippet: updated });
  } catch (error: any) {
    console.error("POST snippet favorite error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}
