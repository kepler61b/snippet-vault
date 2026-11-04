import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, bio, currentPassword, newPassword } = body;

    // 1. Password change
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Укажите текущий пароль" },
          { status: 400 }
        );
      }
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "Новый пароль должен содержать минимум 6 символов" },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: currentUser.id },
      });

      if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
        return NextResponse.json(
          { success: false, error: "Неверный текущий пароль" },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          passwordHash: hashPassword(newPassword),
          tokenVersion: { increment: 1 },
        },
      });

      return NextResponse.json({ success: true, message: "Пароль успешно обновлен" });
    }

    // 2. Profile details change (name, bio)
    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name: typeof name === "string" ? name.trim() : currentUser.name,
        bio: typeof bio === "string" ? bio.trim() : currentUser.bio,
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
