import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    // Run SQLite VACUUM to reclaim space and defragment database
    await prisma.$executeRawUnsafe("VACUUM;");

    await logAuditEvent({
      event: "DATABASE_VACUUM",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      details: "Выполнена оптимизация SQLite базы данных (VACUUM)",
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Оптимизация базы данных успешно завершена",
    });
  } catch (error: any) {
    console.error("Database vacuum error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка оптимизации базы данных" },
      { status: 500 }
    );
  }
}
