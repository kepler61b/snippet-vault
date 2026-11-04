import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { extractIntegrationVersion } from "@/lib/integration-log";

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
    const [vscodeGlobalSetting, tabbyGlobalSetting, vscodeUserSetting, tabbyUserSetting] =
      await Promise.all([
        prisma.setting.findUnique({ where: { key: "integration_version_vscode" } }),
        prisma.setting.findUnique({ where: { key: "integration_version_tabby" } }),
        currentUser.id
          ? prisma.setting.findUnique({ where: { key: `integration_version_vscode_${currentUser.id}` } })
          : null,
        currentUser.id
          ? prisma.setting.findUnique({ where: { key: `integration_version_tabby_${currentUser.id}` } })
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

    const vsCodeLogVersion = findVersionFromLogs((l) =>
      l.client.toLowerCase().includes("vscode") || l.client.toLowerCase().includes("vs code")
    );
    const tabbyLogVersion = findVersionFromLogs((l) =>
      l.client.toLowerCase().includes("tabby")
    );

    const rawVsCodeVersion =
      vscodeUserSetting?.value || vsCodeLogVersion || vscodeGlobalSetting?.value || "0.1.0";
    const rawTabbyVersion =
      tabbyUserSetting?.value || tabbyLogVersion || tabbyGlobalSetting?.value || "0.1.2";

    const vsCodeVersion = rawVsCodeVersion.startsWith("v")
      ? rawVsCodeVersion
      : `v${rawVsCodeVersion}`;
    const tabbyVersion = rawTabbyVersion.startsWith("v")
      ? rawTabbyVersion
      : `v${rawTabbyVersion}`;

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
