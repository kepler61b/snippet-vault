import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { ensureSeedSnippets } from "@/lib/seed";

export async function POST(request: NextRequest) {
  try {
    await ensureSeedSnippets();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Введите email и пароль" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Create temporary token for 2FA challenge (valid for 5 minutes)
      const tempToken = await signToken(
        { userId: user.id, email: user.email, stage: "2fa_challenge" },
        300
      );
      return NextResponse.json({
        success: true,
        require2FA: true,
        tempToken,
      });
    }

    // Direct login
    const token = await signToken({ userId: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      success: true,
      require2FA: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        twoFactorEnabled: user.twoFactorEnabled,
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
