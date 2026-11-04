import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Flush WAL to main db file before backup
    try {
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);");
    } catch {}

    const dbUrl = process.env.DATABASE_URL || "file:./data/snippetvault.db";
    let dbPath = dbUrl.replace(/^file:/, "");
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath);
    }

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ success: false, error: "Database file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const filename = `snippetvault-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("GET database backup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to download backup" },
      { status: 500 }
    );
  }
}
