import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Resolve SQLite db path
    const dbUrl = process.env.DATABASE_URL || "file:./data/snippetvault.db";
    let dbPath = dbUrl.replace(/^file:/, "");
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath);
    }

    let dbFileSize = 0;
    let lastModified: string | null = null;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbFileSize = stats.size;
      lastModified = stats.mtime.toISOString();
    }

    // SQLite PRAGMA queries
    let pageCount = 0;
    let pageSize = 4096;
    let freelistCount = 0;
    let journalMode = "wal";
    let integrity = "ok";

    try {
      const pageCountRes: any = await prisma.$queryRawUnsafe("PRAGMA page_count;");
      if (pageCountRes?.[0]) {
        pageCount = Number(Object.values(pageCountRes[0])[0]) || 0;
      }
    } catch {}

    try {
      const pageSizeRes: any = await prisma.$queryRawUnsafe("PRAGMA page_size;");
      if (pageSizeRes?.[0]) {
        pageSize = Number(Object.values(pageSizeRes[0])[0]) || 4096;
      }
    } catch {}

    try {
      const freelistRes: any = await prisma.$queryRawUnsafe("PRAGMA freelist_count;");
      if (freelistRes?.[0]) {
        freelistCount = Number(Object.values(freelistRes[0])[0]) || 0;
      }
    } catch {}

    try {
      const journalRes: any = await prisma.$queryRawUnsafe("PRAGMA journal_mode;");
      if (journalRes?.[0]) {
        journalMode = String(Object.values(journalRes[0])[0]) || "wal";
      }
    } catch {}

    try {
      const integrityRes: any = await prisma.$queryRawUnsafe("PRAGMA integrity_check(1);");
      if (integrityRes?.[0]) {
        integrity = String(Object.values(integrityRes[0])[0]) || "ok";
      }
    } catch {}

    const freelistBytes = freelistCount * pageSize;
    const memory = process.memoryUsage();
    const memoryRss = memory.rss;

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
        lastModified,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRss,
        memoryRssFormatted: formatBytes(memoryRss),
        nodeVersion: process.version,
        platform: `${process.platform} (${process.arch})`,
      },
    });
  } catch (error: any) {
    console.error("GET system health error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load system health" },
      { status: 500 }
    );
  }
}
