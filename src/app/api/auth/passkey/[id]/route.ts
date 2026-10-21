import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const passkey = await prisma.passkey.findFirst({
      where: { id, userId: user.id },
    });

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: "Ключ доступа не найден" },
        { status: 404 }
      );
    }

    await prisma.passkey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Passkey удален" });
  } catch (error: any) {
    console.error("Passkey delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка удаления Passkey" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Название ключа не может быть пустым" },
        { status: 400 }
      );
    }

    const passkey = await prisma.passkey.findFirst({
      where: { id, userId: user.id },
    });

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: "Ключ доступа не найден" },
        { status: 404 }
      );
    }

    const updated = await prisma.passkey.update({
      where: { id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ success: true, passkey: updated });
  } catch (error: any) {
    console.error("Passkey rename error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка изменения названия Passkey" },
      { status: 500 }
    );
  }
}
