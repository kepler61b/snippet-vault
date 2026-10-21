import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";

export async function DELETE(
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
        { success: false, error: "Вы не можете удалить собственный аккаунт администратора" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // If target is an admin, check that it's not the last one
    if (targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Невозможно удалить единственного администратора системы" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: targetId },
    });

    return NextResponse.json({ success: true, message: "Пользователь успешно удален" });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка удаления пользователя" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { id: targetId } = await context.params;
    const body = await request.json();
    const { role, password, name } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};

    if (role !== undefined) {
      if (role !== "ADMIN" && role !== "USER") {
        return NextResponse.json(
          { success: false, error: "Недопустимая роль. Допустимы: ADMIN или USER" },
          { status: 400 }
        );
      }

      // If demoting an admin, ensure at least one other admin remains
      if (targetUser.role === "ADMIN" && role === "USER") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: "Невозможно отозвать права у единственного администратора" },
            { status: 400 }
          );
        }
      }

      dataToUpdate.role = role;
    }

    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { success: false, error: "Новый пароль должен содержать не менее 6 символов" },
          { status: 400 }
        );
      }
      dataToUpdate.passwordHash = hashPassword(password);
    }

    if (name !== undefined) {
      dataToUpdate.name = name.trim();
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        twoFactorEnabled: true,
        createdAt: true,
        _count: {
          select: {
            snippets: true,
            collections: true,
            passkeys: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}
