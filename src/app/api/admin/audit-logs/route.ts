import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const category = searchParams.get("category")?.trim().toUpperCase();
    const status = searchParams.get("status")?.trim().toUpperCase();
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { event: { contains: search } },
        { actorEmail: { contains: search } },
        { targetEmail: { contains: search } },
        { details: { contains: search } },
        { ip: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Compute category counts
    const [authCount, adminCount, securityCount, apiCount, failureCount] = await Promise.all([
      prisma.auditLog.count({ where: { category: "AUTH" } }),
      prisma.auditLog.count({ where: { category: "ADMIN" } }),
      prisma.auditLog.count({ where: { category: "SECURITY" } }),
      prisma.auditLog.count({ where: { category: "API" } }),
      prisma.auditLog.count({ where: { status: "FAILURE" } }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      stats: {
        total,
        authCount,
        adminCount,
        securityCount,
        apiCount,
        failureCount,
      },
    });
  } catch (error: any) {
    console.error("Admin get audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения журнала аудита" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    await prisma.auditLog.deleteMany({});

    // Record that audit logs were cleared
    await logAuditEvent({
      event: "AUDIT_LOGS_CLEARED",
      category: "SECURITY",
      status: "WARNING",
      actorId: admin.id,
      actorEmail: admin.email,
      details: `Журнал безопасности очищен администратором ${admin.email}`,
      request,
    });

    return NextResponse.json({ success: true, message: "Журнал аудита очищен" });
  } catch (error: any) {
    console.error("Admin clear audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка очистки журнала" },
      { status: 500 }
    );
  }
}
