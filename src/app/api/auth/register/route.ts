import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword, signToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Check if registration is disabled by administrator
    const regDisabledSetting = await prisma.setting.findUnique({
      where: { key: "registration_disabled" },
    });
    if (regDisabledSetting?.value === "true") {
      return NextResponse.json(
        { success: false, error: "Регистрация новых пользователей отключена администратором" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный адрес электронной почты" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Пользователь с таким email уже зарегистрирован" },
        { status: 400 }
      );
    }

    const totalUsers = await prisma.user.count();
    const role = totalUsers === 0 ? "ADMIN" : "USER";

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name?.trim() || cleanEmail.split("@")[0],
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });
    await setSessionCookie(token, request);

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка регистрации" },
      { status: 500 }
    );
  }
}
