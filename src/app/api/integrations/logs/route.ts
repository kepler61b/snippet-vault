import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  extractIntegrationVersion,
  isValidPluginVersion,
  extractIntegrationAppVersion,
  isValidAppVersion,
} from "@/lib/integration-log";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const logs = await prisma.integrationLog.findMany({
      where:
        currentUser.role === "ADMIN"
          ? undefined
          : { OR: [{ userId: currentUser.id }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const total = logs.length;
    const vsCodeCount = logs.filter((l: any) =>
      l.client.toLowerCase().includes("vscode") || l.client.toLowerCase().includes("vs code")
    ).length;
    const tabbyCount = logs.filter((l: any) =>
      l.client.toLowerCase().includes("tabby")
    ).length;
    const curlCount = logs.filter(
      (l: any) =>
        l.client.toLowerCase().includes("curl") ||
        l.client.toLowerCase().includes("terminal") ||
        l.client.toLowerCase().includes("wget") ||
        l.client.toLowerCase().includes("cli")
    ).length;
    const errorsCount = logs.filter((l: any) => l.status >= 400).length;
    const lastActive = logs[0]?.createdAt?.toISOString() || null;

    // Detect versions from persisted settings or recent logs
    const [
      vscodeGlobalSetting,
      tabbyGlobalSetting,
      vscodeUserSetting,
      tabbyUserSetting,
      vscodeAppGlobalSetting,
      tabbyAppGlobalSetting,
      vscodeAppUserSetting,
      tabbyAppUserSetting,
    ] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "integration_version_vscode" } }),
      prisma.setting.findUnique({ where: { key: "integration_version_tabby" } }),
      currentUser.id
        ? prisma.setting.findUnique({ where: { key: `integration_version_vscode_${currentUser.id}` } })
        : null,
      currentUser.id
        ? prisma.setting.findUnique({ where: { key: `integration_version_tabby_${currentUser.id}` } })
        : null,
      prisma.setting.findUnique({ where: { key: "integration_app_version_vscode" } }),
      prisma.setting.findUnique({ where: { key: "integration_app_version_tabby" } }),
      currentUser.id
        ? prisma.setting.findUnique({ where: { key: `integration_app_version_vscode_${currentUser.id}` } })
        : null,
      currentUser.id
        ? prisma.setting.findUnique({ where: { key: `integration_app_version_tabby_${currentUser.id}` } })
        : null,
    ]);

    const findVersionFromLogs = (filterFn: (l: any) => boolean) => {
      for (const l of logs) {
        if (filterFn(l)) {
          const v = extractIntegrationVersion(null, l.userAgent);
          if (v) return v;
        }
      }
      return null;
    };

    const findAppVersionFromLogs = (filterFn: (l: any) => boolean) => {
      for (const l of logs) {
        if (filterFn(l)) {
          const v = extractIntegrationAppVersion(null, l.userAgent);
          if (v) return v;
        }
      }
      return null;
    };

    const vsCodeLogVersion = findVersionFromLogs((l) =>
      l.client.toLowerCase().includes("vscode") || l.client.toLowerCase().includes("vs code")
    );
    const tabbyLogVersion = findVersionFromLogs((l) =>
      l.client.toLowerCase().includes("tabby")
    );

    const vsCodeAppLogVersion = findAppVersionFromLogs((l) =>
      l.client.toLowerCase().includes("vscode") || l.client.toLowerCase().includes("vs code")
    );
    const tabbyAppLogVersion = findAppVersionFromLogs((l) =>
      l.client.toLowerCase().includes("tabby")
    );

    // Purge invalid host app versions from plugin settings
    if (tabbyGlobalSetting?.value && !isValidPluginVersion("tabby", tabbyGlobalSetting.value)) {
      prisma.setting.delete({ where: { key: "integration_version_tabby" } }).catch(() => {});
    }
    if (tabbyUserSetting?.value && !isValidPluginVersion("tabby", tabbyUserSetting.value)) {
      prisma.setting.delete({ where: { key: `integration_version_tabby_${currentUser.id}` } }).catch(() => {});
    }
    if (vscodeGlobalSetting?.value && !isValidPluginVersion("vscode", vscodeGlobalSetting.value)) {
      prisma.setting.delete({ where: { key: "integration_version_vscode" } }).catch(() => {});
    }
    if (vscodeUserSetting?.value && !isValidPluginVersion("vscode", vscodeUserSetting.value)) {
      prisma.setting.delete({ where: { key: `integration_version_vscode_${currentUser.id}` } }).catch(() => {});
    }

    // Purge invalid plugin versions from app settings if any
    if (tabbyAppGlobalSetting?.value && !isValidAppVersion("tabby", tabbyAppGlobalSetting.value)) {
      prisma.setting.delete({ where: { key: "integration_app_version_tabby" } }).catch(() => {});
    }
    if (tabbyAppUserSetting?.value && !isValidAppVersion("tabby", tabbyAppUserSetting.value)) {
      prisma.setting.delete({ where: { key: `integration_app_version_tabby_${currentUser.id}` } }).catch(() => {});
    }
    if (vscodeAppGlobalSetting?.value && !isValidAppVersion("vscode", vscodeAppGlobalSetting.value)) {
      prisma.setting.delete({ where: { key: "integration_app_version_vscode" } }).catch(() => {});
    }
    if (vscodeAppUserSetting?.value && !isValidAppVersion("vscode", vscodeAppUserSetting.value)) {
      prisma.setting.delete({ where: { key: `integration_app_version_vscode_${currentUser.id}` } }).catch(() => {});
    }

    const rawVsCodeVersion =
      (isValidPluginVersion("vscode", vscodeUserSetting?.value) && vscodeUserSetting?.value) ||
      (isValidPluginVersion("vscode", vsCodeLogVersion) && vsCodeLogVersion) ||
      (isValidPluginVersion("vscode", vscodeGlobalSetting?.value) && vscodeGlobalSetting?.value) ||
      "0.1.0";
    const rawTabbyVersion =
      (isValidPluginVersion("tabby", tabbyUserSetting?.value) && tabbyUserSetting?.value) ||
      (isValidPluginVersion("tabby", tabbyLogVersion) && tabbyLogVersion) ||
      (isValidPluginVersion("tabby", tabbyGlobalSetting?.value) && tabbyGlobalSetting?.value) ||
      "0.1.2";

    const rawVsCodeAppVersion =
      (isValidAppVersion("vscode", vscodeAppUserSetting?.value) && vscodeAppUserSetting?.value) ||
      (isValidAppVersion("vscode", vsCodeAppLogVersion) && vsCodeAppLogVersion) ||
      (isValidAppVersion("vscode", vscodeAppGlobalSetting?.value) && vscodeAppGlobalSetting?.value) ||
      "1.96.2";
    const rawTabbyAppVersion =
      (isValidAppVersion("tabby", tabbyAppUserSetting?.value) && tabbyAppUserSetting?.value) ||
      (isValidAppVersion("tabby", tabbyAppLogVersion) && tabbyAppLogVersion) ||
      (isValidAppVersion("tabby", tabbyAppGlobalSetting?.value) && tabbyAppGlobalSetting?.value) ||
      "1.0.238";

    const vsCodeVersion = rawVsCodeVersion.startsWith("v")
      ? rawVsCodeVersion
      : `v${rawVsCodeVersion}`;
    const tabbyVersion = rawTabbyVersion.startsWith("v")
      ? rawTabbyVersion
      : `v${rawTabbyVersion}`;
    const vsCodeAppVersion = rawVsCodeAppVersion.replace(/^v/i, "");
    const tabbyAppVersion = rawTabbyAppVersion.replace(/^v/i, "");

    return NextResponse.json({
      success: true,
      logs: logs.map((l: any) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      stats: {
        total,
        vsCodeCount,
        tabbyCount,
        curlCount,
        errorsCount,
        lastActive,
        vsCodeVersion,
        tabbyVersion,
        vsCodeAppVersion,
        tabbyAppVersion,
      },
    });
  } catch (error: any) {
    console.error("Error fetching integration logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role === "ADMIN") {
      await prisma.integrationLog.deleteMany();
    } else {
      await prisma.integrationLog.deleteMany({
        where: { userId: currentUser.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting integration logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to clear logs" },
      { status: 500 }
    );
  }
}
