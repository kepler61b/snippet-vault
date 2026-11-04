import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";
import { ensureSeedSnippets } from "@/lib/seed";

export async function POST(request: NextRequest) {
  try {
    await ensureSeedSnippets();

    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Укажите email и пароль" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { success: false, error: "Ваш аккаунт заблокирован администратором" },
        { status: 403 }
      );
    }

    if (user.twoFactorEnabled) {
      const tempToken = await signToken(
        { userId: user.id, email: user.email, temp2FA: true },
        300
      );
      return NextResponse.json({
        success: true,
        require2FA: true,
        tempToken,
      });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    });

    await setSessionCookie(token, request);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка авторизации" },
      { status: 500 }
    );
  }
}
