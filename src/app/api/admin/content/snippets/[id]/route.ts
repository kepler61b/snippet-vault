import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyDataChange } from "@/lib/sync-events";

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
    const snippet = await prisma.snippet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!snippet) {
      return NextResponse.json(
        { success: false, error: "Сниппет не найден" },
        { status: 404 }
      );
    }

    await prisma.snippet.delete({
      where: { id: snippet.id },
    });

    await logAuditEvent({
      event: "SETTINGS_CHANGE",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: snippet.userId || undefined,
      targetEmail: snippet.user?.email || undefined,
      details: `Администратор удалил сниппет "${snippet.title}" (${snippet.id})`,
      request,
    });

    notifyDataChange("snippets", { action: "deleted" });

    return NextResponse.json({
      success: true,
      message: "Сниппет успешно удален",
    });
  } catch (error: any) {
    console.error("Admin delete snippet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка удаления сниппета" },
      { status: 500 }
    );
  }
}
