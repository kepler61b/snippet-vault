import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const response = NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
  return NextResponse.json({ success: true, user });
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const response = NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    const body = await request.json();
    const { name, bio, currentPassword, newPassword } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (bio !== undefined) dataToUpdate.bio = bio.trim();

    // Password change request
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Для смены пароля введите текущий пароль" },
          { status: 400 }
        );
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser || !verifyPassword(currentPassword, fullUser.passwordHash)) {
        return NextResponse.json(
          { success: false, error: "Текущий пароль указан неверно" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "Новый пароль должен содержать минимум 6 символов" },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка обновления профиля" },
      { status: 500 }
    );
  }
}
