import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const [regSetting, denyNeverSetting, maxDaysSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "registration_disabled" } }),
      prisma.setting.findUnique({ where: { key: "pat_deny_never_expires" } }),
      prisma.setting.findUnique({ where: { key: "pat_max_days" } }),
    ]);

    const now = new Date();
    const [
      totalUsers,
      totalSnippets,
      totalCollections,
      bannedUsers,
      adminUsers,
      totalTokens,
      activeTokens,
      totalIntegrationLogs,
      vsCodeCalls,
      curlCalls,
      integrationErrors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.snippet.count(),
      prisma.collection.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.personalAccessToken.count(),
      prisma.personalAccessToken.count({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.integrationLog.count(),
      prisma.integrationLog.count({
        where: {
          OR: [
            { client: { contains: "VS Code" } },
            { userAgent: "node" },
            { userAgent: { contains: "vscode" } },
          ],
        },
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
    ]);

    const expiredTokens = Math.max(0, totalTokens - activeTokens);

    return NextResponse.json({
      success: true,
      settings: {
        registrationDisabled: regSetting?.value === "true",
        patDenyNeverExpires: denyNeverSetting?.value === "true",
        patMaxDays: maxDaysSetting ? parseInt(maxDaysSetting.value, 10) || 0 : 0,
      },
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
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const { registrationDisabled, patDenyNeverExpires, patMaxDays } = body;

    const updates: Promise<any>[] = [];

    if (typeof registrationDisabled === "boolean") {
      updates.push(
        prisma.setting.upsert({
          where: { key: "registration_disabled" },
          update: { value: registrationDisabled ? "true" : "false" },
          create: { key: "registration_disabled", value: registrationDisabled ? "true" : "false" },
        })
      );
    }

    if (typeof patDenyNeverExpires === "boolean") {
      updates.push(
        prisma.setting.upsert({
          where: { key: "pat_deny_never_expires" },
          update: { value: patDenyNeverExpires ? "true" : "false" },
          create: { key: "pat_deny_never_expires", value: patDenyNeverExpires ? "true" : "false" },
        })
      );
    }

    if (typeof patMaxDays === "number") {
      const clampedDays = Math.max(0, Math.min(3650, patMaxDays));
      updates.push(
        prisma.setting.upsert({
          where: { key: "pat_max_days" },
          update: { value: clampedDays.toString() },
          create: { key: "pat_max_days", value: clampedDays.toString() },
        })
      );
    }

    await Promise.all(updates);

    await logAuditEvent({
      event: "SETTINGS_CHANGE",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      details: "Обновлены системные настройки и политики безопасности PAT",
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Настройки успешно сохранены",
      settings: {
        registrationDisabled: Boolean(registrationDisabled),
        patDenyNeverExpires: Boolean(patDenyNeverExpires),
        patMaxDays: typeof patMaxDays === "number" ? patMaxDays : 0,
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
