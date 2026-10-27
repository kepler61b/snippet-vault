import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { id } = await params;

    const token = await prisma.personalAccessToken.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Токен не найден" },
        { status: 404 }
      );
    }

    await prisma.personalAccessToken.delete({
      where: { id },
    });

    // Log admin action to integration log
    await prisma.integrationLog
      .create({
        data: {
          client: "Admin Console",
          action: `Отозван токен "${token.name}"`,
          method: "DELETE",
          path: `/api/admin/tokens/${id}`,
          status: 200,
          tokenPrefix: token.tokenPrefix,
          userId: token.user?.id || null,
          details: `Токен пользователя ${token.user?.email || "неизвестен"} отозван администратором ${admin.email}`,
        },
      })
      .catch(() => {});

    await logAuditEvent({
      event: "TOKEN_REVOKE",
      category: "SECURITY",
      status: "WARNING",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: token.user?.id || null,
      targetEmail: token.user?.email || null,
      details: `Отозван токен "${token.name}" (${token.tokenPrefix}) пользователя ${token.user?.email || "неизвестен"}`,
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Токен успешно отозван",
    });
  } catch (error: any) {
    console.error("Admin revoke token error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка отзыва токена" },
      { status: 500 }
    );
  }
}
