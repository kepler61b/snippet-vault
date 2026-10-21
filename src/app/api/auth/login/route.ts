import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie, hashPassword } from "@/lib/auth";
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

    // Check if database has 0 users -> allow initial local admin login
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) {
      if (cleanEmail === "admin@snippetvault.local" || cleanEmail === "admin") {
        if (password === "admin" || password === "admin12345") {
          const newAdmin = await prisma.user.create({
            data: {
              email: "admin@snippetvault.local",
              name: "Администратор",
              role: "ADMIN",
              passwordHash: hashPassword(password),
            },
          });
          const token = await signToken({ userId: newAdmin.id, email: newAdmin.email });
          await setSessionCookie(token, request);
          return NextResponse.json({
            success: true,
            require2FA: false,
            user: {
              id: newAdmin.id,
              email: newAdmin.email,
              name: newAdmin.name,
              role: newAdmin.role,
              twoFactorEnabled: false,
            },
          });
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
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
    await setSessionCookie(token, request);

    return NextResponse.json({
      success: true,
      require2FA: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        role: user.role,
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
