import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { id: targetId } = await context.params;

    if (admin.id === targetId) {
      return NextResponse.json(
        { success: false, error: "Вы не можете заблокировать свой собственный аккаунт" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, isBanned: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    let isBannedToSet = !targetUser.isBanned;

    // Check optional body for explicit boolean
    try {
      const body = await request.json();
      if (typeof body.isBanned === "boolean") {
        isBannedToSet = body.isBanned;
      }
    } catch {
      // Body not provided or not JSON, toggle used
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isBanned: isBannedToSet },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
      },
    });

    logAuditEvent({
      event: updated.isBanned ? "ADMIN_USER_BAN" : "ADMIN_USER_UNBAN",
      category: "ADMIN",
      status: updated.isBanned ? "WARNING" : "INFO",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: updated.id,
      targetEmail: updated.email,
      details: updated.isBanned
        ? `Пользователь ${updated.email} заблокирован администратором ${admin.email}`
        : `Пользователь ${updated.email} разблокирован администратором ${admin.email}`,
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: updated,
      message: updated.isBanned ? "Пользователь заблокирован" : "Пользователь разблокирован",
    });
  } catch (error: any) {
    console.error("Admin toggle ban error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка изменения статуса блокировки" },
      { status: 500 }
    );
  }
}
