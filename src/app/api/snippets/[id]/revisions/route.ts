import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const revisions = await prisma.snippetRevision.findMany({
      where: { snippetId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const parsed = revisions.map((r) => {
      let files = [];
      try {
        files = JSON.parse(r.filesJson);
      } catch {}
      return {
        id: r.id,
        snippetId: r.snippetId,
        title: r.title,
        description: r.description,
        tags: r.tags,
        files,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ success: true, revisions: parsed });
  } catch (error: any) {
    console.error("GET snippet revisions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load revisions" },
      { status: 500 }
    );
  }
}
