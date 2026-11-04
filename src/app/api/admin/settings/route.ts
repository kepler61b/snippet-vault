import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const now = new Date();

    const [
      totalUsers,
      adminUsers,
      bannedUsers,
      totalSnippets,
      totalCollections,
      totalTokens,
      activeTokens,
      totalIntegrationLogs,
      vsCodeCalls,
      curlCalls,
      integrationErrors,
      settingsRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.snippet.count(),
      prisma.collection.count(),
      prisma.personalAccessToken.count(),
      prisma.personalAccessToken.count({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.integrationLog.count(),
      prisma.integrationLog.count({
        where: { client: { contains: "VS Code" } },
      }),
      prisma.integrationLog.count({
        where: {
          OR: [
            { client: { contains: "cURL" } },
            { client: { contains: "Terminal" } },
          ],
        },
      }),
      prisma.integrationLog.count({
        where: { status: { gte: 400 } },
      }),
      prisma.setting.findMany(),
    ]);

    const expiredTokens = totalTokens - activeTokens;

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        adminUsers,
        bannedUsers,
        totalSnippets,
        totalCollections,
        totalTokens,
        activeTokens,
        expiredTokens,
        totalIntegrationLogs,
        vsCodeCalls,
        curlCalls,
        integrationErrors,
      },
      settings,
    });
  } catch (error: any) {
    console.error("Error fetching admin settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const settingsObj = (body.settings && typeof body.settings === "object") ? body.settings : body;

    if (settingsObj && typeof settingsObj === "object") {
      for (const [key, val] of Object.entries(settingsObj)) {
        if (key === "settings" || typeof val === "function") continue;
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(val) },
          create: { key, value: String(val) },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Настройки сохранены" });
  } catch (error: any) {
    console.error("Error saving admin settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
