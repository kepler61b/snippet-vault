import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const snippet = await prisma.snippet.findUnique({ where: { id } });
    if (!snippet) {
      return NextResponse.json({ success: false, error: "Snippet not found" }, { status: 404 });
    }

    await prisma.snippet.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Snippet deleted" });
  } catch (error: any) {
    console.error("DELETE admin snippet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete snippet" },
      { status: 500 }
    );
  }
}
