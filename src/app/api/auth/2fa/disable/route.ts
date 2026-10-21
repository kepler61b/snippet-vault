import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Для отключения 2FA введите текущий пароль" },
        { status: 400 }
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser || !verifyPassword(password, fullUser.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "Неверный пароль" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Двухфакторная аутентификация отключена",
    });
  } catch (error: any) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка отключения 2FA" },
      { status: 500 }
    );
  }
}
