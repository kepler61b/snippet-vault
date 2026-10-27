import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const logs = await prisma.integrationLog.findMany({
      where: {
        OR: [{ userId: currentUser.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    // Compute stats
    let vsCodeCount = 0;
    let curlCount = 0;
    let errorsCount = 0;
    let lastActive: Date | null = null;

    if (logs.length > 0) {
      lastActive = logs[0].createdAt;
    }

    for (const log of logs) {
      if (log.client.includes("VS Code") || log.userAgent === "node" || (log.userAgent && log.userAgent.toLowerCase().includes("vscode"))) vsCodeCount++;
      if (log.client.includes("cURL") || log.client.includes("Terminal")) curlCount++;
      if (log.status >= 400) errorsCount++;
    }

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        total: logs.length,
        vsCodeCount,
        curlCount,
        errorsCount,
        lastActive,
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.integrationLog.deleteMany({
      where: {
        OR: [{ userId: currentUser.id }, { userId: null }],
      },
    });

    return NextResponse.json({ success: true, message: "Logs cleared" });
  } catch (error: any) {
    console.error("Error clearing integration logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to clear logs" },
      { status: 500 }
    );
  }
}
