import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyToken, signToken, COOKIE_NAME } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json(
        { success: false, error: "Укажите код подтверждения" },
        { status: 400 }
      );
    }

    const payload = await verifyToken<any>(tempToken);
    if (!payload?.userId || payload.stage !== "2fa_challenge") {
      return NextResponse.json(
        { success: false, error: "Сессия двухфакторной аутентификации истекла. Войдите снова." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { success: false, error: "Двухфакторная аутентификация не настроена для этого аккаунта" },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(user.twoFactorSecret, code.trim());
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Неверный код доступа. Попробуйте еще раз." },
        { status: 400 }
      );
    }

    // Set full session cookie
    const token = await signToken({ userId: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка проверки 2FA" },
      { status: 500 }
    );
  }
}
