import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(logs, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // CSV format
    const header = ["Timestamp", "Category", "Event", "Status", "Actor", "Target", "IP", "UserAgent", "Details"];
    const rows = logs.map((l) => [
      `"${l.createdAt.toISOString()}"`,
      `"${l.category}"`,
      `"${l.event}"`,
      `"${l.status}"`,
      `"${(l.actorEmail || "").replace(/"/g, '""')}"`,
      `"${(l.targetEmail || "").replace(/"/g, '""')}"`,
      `"${(l.ip || "").replace(/"/g, '""')}"`,
      `"${(l.userAgent || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse("\uFEFF" + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка экспорта" },
      { status: 500 }
    );
  }
}
