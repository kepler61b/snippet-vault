import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const regSetting = await prisma.setting.findUnique({
      where: { key: "registration_disabled" },
    });

    const totalUsers = await prisma.user.count();
    const totalSnippets = await prisma.snippet.count();
    const totalCollections = await prisma.collection.count();
    const bannedUsers = await prisma.user.count({ where: { isBanned: true } });
    const adminUsers = await prisma.user.count({ where: { role: "ADMIN" } });

    return NextResponse.json({
      success: true,
      settings: {
        registrationDisabled: regSetting?.value === "true",
      },
      stats: {
        totalUsers,
        adminUsers,
        bannedUsers,
        totalSnippets,
        totalCollections,
      },
    });
  } catch (error: any) {
    console.error("Admin get settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения настроек" },
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
    const { registrationDisabled } = body;

    if (typeof registrationDisabled === "boolean") {
      await prisma.setting.upsert({
        where: { key: "registration_disabled" },
        update: { value: registrationDisabled ? "true" : "false" },
        create: { key: "registration_disabled", value: registrationDisabled ? "true" : "false" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Настройки успешно сохранены",
      settings: {
        registrationDisabled: Boolean(registrationDisabled),
      },
    });
  } catch (error: any) {
    console.error("Admin save settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка сохранения настроек" },
      { status: 500 }
    );
  }
}
