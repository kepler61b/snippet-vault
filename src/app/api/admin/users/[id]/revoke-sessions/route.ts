import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, tokenVersion: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, tokenVersion: true },
    });

    await logAuditEvent({
      event: "SESSION_REVOKED",
      category: "SECURITY",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: updatedUser.id,
      targetEmail: updatedUser.email,
      details: `Сброшены все активные сессии пользователя (tokenVersion: ${updatedUser.tokenVersion})`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Все сессии пользователя успешно завершены",
      tokenVersion: updatedUser.tokenVersion,
    });
  } catch (error: any) {
    console.error("Revoke sessions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка сброса сессий" },
      { status: 500 }
    );
  }
}
