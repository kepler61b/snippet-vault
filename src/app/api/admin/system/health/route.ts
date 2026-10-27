import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const dbPath = path.resolve(process.cwd(), "data", "snippetvault.db");
    let dbFileSize = 0;
    let dbModified: string | null = null;

    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      dbFileSize = stat.size;
      dbModified = stat.mtime.toISOString();
    }

    // Run SQLite PRAGMAs
    let integrity = "unknown";
    let pageSize = 4096;
    let pageCount = 0;
    let freelistCount = 0;
    let journalMode = "wal";

    try {
      const integrityRes: any = await prisma.$queryRawUnsafe("PRAGMA integrity_check;");
      if (Array.isArray(integrityRes) && integrityRes[0]) {
        integrity = integrityRes[0].integrity_check || "ok";
      }

      const pageSizeRes: any = await prisma.$queryRawUnsafe("PRAGMA page_size;");
      if (Array.isArray(pageSizeRes) && pageSizeRes[0]) {
        pageSize = Number(pageSizeRes[0].page_size) || 4096;
      }

      const pageCountRes: any = await prisma.$queryRawUnsafe("PRAGMA page_count;");
      if (Array.isArray(pageCountRes) && pageCountRes[0]) {
        pageCount = Number(pageCountRes[0].page_count) || 0;
      }

      const freelistRes: any = await prisma.$queryRawUnsafe("PRAGMA freelist_count;");
      if (Array.isArray(freelistRes) && freelistRes[0]) {
        freelistCount = Number(freelistRes[0].freelist_count) || 0;
      }

      const journalRes: any = await prisma.$queryRawUnsafe("PRAGMA journal_mode;");
      if (Array.isArray(journalRes) && journalRes[0]) {
        journalMode = journalRes[0].journal_mode || "wal";
      }
    } catch (e: any) {
      console.warn("Could not query PRAGMAs:", e.message);
    }

    const freelistBytes = freelistCount * pageSize;
    const memUsage = process.memoryUsage();

    return NextResponse.json({
      success: true,
      health: {
        dbFileSize,
        dbFileSizeFormatted: formatBytes(dbFileSize),
        freelistBytes,
        freelistFormatted: formatBytes(freelistBytes),
        pageCount,
        pageSize,
        journalMode,
        integrity,
        lastModified: dbModified,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRss: memUsage.rss,
        memoryRssFormatted: formatBytes(memUsage.rss),
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  } catch (error: any) {
    console.error("System health check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения статуса системы" },
      { status: 500 }
    );
  }
}
