import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();
    const userId = searchParams.get("userId");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    const [snippets, total] = await Promise.all([
      prisma.snippet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              files: true,
            },
          },
        },
      }),
      prisma.snippet.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      snippets,
      total,
    });
  } catch (error: any) {
    console.error("GET admin content snippets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load snippets" },
      { status: 500 }
    );
  }
}
