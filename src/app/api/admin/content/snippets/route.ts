import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";
    const userId = searchParams.get("userId") || undefined;
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { tags: { contains: query } },
        { user: { email: { contains: query } } },
        { user: { name: { contains: query } } },
      ];
    }

    const [snippets, total] = await Promise.all([
      prisma.snippet.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
          collection: {
            select: { id: true, name: true },
          },
          _count: {
            select: { files: true },
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
    console.error("Admin get snippets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения сниппетов" },
      { status: 500 }
    );
  }
}
