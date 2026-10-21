import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        role: true,
        isBanned: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            snippets: true,
            collections: true,
            passkeys: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("Admin get users error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения списка пользователей" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role = "USER" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный адрес электронной почты" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Пароль должен содержать не менее 6 символов" },
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
        { success: false, error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    const validRole = role === "ADMIN" ? "ADMIN" : "USER";
    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name?.trim() || cleanEmail.split("@")[0],
        role: validRole,
      },
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

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка создания пользователя" },
      { status: 500 }
    );
  }
}
