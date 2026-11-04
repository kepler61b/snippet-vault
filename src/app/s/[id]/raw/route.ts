import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileIndex = Number(searchParams.get("file")) || 0;

    const snippet = await prisma.snippet.findFirst({
      where: {
        OR: [{ shareToken: id }, { id }],
      },
      include: {
        files: { orderBy: { order: "asc" } },
      },
    });

    if (!snippet || !snippet.files.length) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const file = snippet.files[fileIndex] || snippet.files[0];

    return new NextResponse(file.content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${file.filename}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
