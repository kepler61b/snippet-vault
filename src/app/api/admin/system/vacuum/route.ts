import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // SQLite WAL checkpoint and VACUUM
    try {
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}

    await prisma.$queryRawUnsafe("VACUUM;");

    await logAuditEvent({
      event: "DATABASE_VACUUM",
      category: "ADMIN",
      actorId: admin.id,
      actorEmail: admin.email,
      details: "Database VACUUM executed successfully",
      request,
    });

    return NextResponse.json({ success: true, message: "Database vacuumed successfully" });
  } catch (error: any) {
    console.error("POST vacuum error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to vacuum database" },
      { status: 500 }
    );
  }
}
