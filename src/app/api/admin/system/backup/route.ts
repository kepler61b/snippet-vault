import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const dbPath = path.resolve(process.cwd(), "data", "snippetvault.db");
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { success: false, error: "Файл базы данных не найден" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `snippetvault-backup-${dateStr}.sqlite`;

    logAuditEvent({
      event: "SETTINGS_CHANGE",
      category: "ADMIN",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      details: `Скачан полный бэкап базы данных SQLite (${fileName})`,
      request,
    }).catch(() => {});

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Backup download error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка скачивания бэкапа" },
      { status: 500 }
    );
  }
}
