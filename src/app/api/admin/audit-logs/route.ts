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
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { event: { contains: search } },
        { actorEmail: { contains: search } },
        { targetEmail: { contains: search } },
        { ip: { contains: search } },
        { details: { contains: search } },
      ];
    }

    const [logs, countAll, countAuth, countAdmin, countSecurity, countFailure] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { category: "AUTH" } }),
      prisma.auditLog.count({ where: { category: "ADMIN" } }),
      prisma.auditLog.count({ where: { category: "SECURITY" } }),
      prisma.auditLog.count({ where: { status: "FAILURE" } }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      counts: {
        ALL: countAll,
        AUTH: countAuth,
        ADMIN: countAdmin,
        SECURITY: countSecurity,
        FAILURE: countFailure,
      },
    });
  } catch (error: any) {
    console.error("GET audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load audit logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.auditLog.deleteMany({});

    return NextResponse.json({ success: true, message: "Audit logs cleared" });
  } catch (error: any) {
    console.error("DELETE audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to clear audit logs" },
      { status: 500 }
    );
  }
}
