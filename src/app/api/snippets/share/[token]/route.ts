import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const snippet = await prisma.snippet.findFirst({
      where: {
        OR: [
          { shareToken: token },
          { id: token },
        ],
      },
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!snippet) {
      return NextResponse.json(
        { success: false, error: "Snippet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, snippet });
  } catch (error: any) {
    console.error("Error fetching shared snippet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch snippet" },
      { status: 500 }
    );
  }
}
