import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "csv" ? "csv" : "json";

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const header = ["ID", "Timestamp", "Event", "Category", "Status", "Actor Email", "Target Email", "IP", "Details"];
      const escapeCsv = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

      const rows = logs.map((log) => [
        escapeCsv(log.id),
        escapeCsv(log.createdAt.toISOString()),
        escapeCsv(log.event),
        escapeCsv(log.category),
        escapeCsv(log.status),
        escapeCsv(log.actorEmail),
        escapeCsv(log.targetEmail),
        escapeCsv(log.ip),
        escapeCsv(log.details),
      ]);

      const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-logs-${dateStr}.csv"`,
        },
      });
    }

    const jsonContent = JSON.stringify(logs, null, 2);
    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${dateStr}.json"`,
      },
    });
  } catch (error: any) {
    console.error("GET audit logs export error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export logs" },
      { status: 500 }
    );
  }
}
