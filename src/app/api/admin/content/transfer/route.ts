import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";
import { notifyDataChange } from "@/lib/sync-events";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const {
      fromUserId,
      toUserId,
      transferSnippets = true,
      transferCollections = true,
    } = body;

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { success: false, error: "Укажите исходного и целевого пользователя" },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { success: false, error: "Исходный и целевой пользователь должны отличаться" },
        { status: 400 }
      );
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: fromUserId },
        select: { id: true, email: true, name: true },
      }),
      prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true, email: true, name: true },
      }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json(
        { success: false, error: "Один из пользователей не найден" },
        { status: 404 }
      );
    }

    let transferredSnippets = 0;
    let transferredCollections = 0;

    if (transferCollections) {
      const collectionsRes = await prisma.collection.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      });
      transferredCollections = collectionsRes.count;
    }

    if (transferSnippets) {
      const snippetsRes = await prisma.snippet.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      });
      transferredSnippets = snippetsRes.count;
    }

    await logAuditEvent({
      event: "CONTENT_TRANSFER",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: toUser.id,
      targetEmail: toUser.email,
      details: `Перенесен контент от ${fromUser.email} к ${toUser.email} (Сниппетов: ${transferredSnippets}, Коллекций: ${transferredCollections})`,
      request,
    });

    notifyDataChange("snippets");
    notifyDataChange("collections");

    return NextResponse.json({
      success: true,
      message: `Успешно перенесено ${transferredSnippets} сниппетов и ${transferredCollections} коллекций`,
      transferredSnippets,
      transferredCollections,
    });
  } catch (error: any) {
    console.error("Admin content transfer error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка переноса контента" },
      { status: 500 }
    );
  }
}
