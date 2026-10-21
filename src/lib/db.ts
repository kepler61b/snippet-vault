import { PrismaClient } from "@prisma/client";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function getDatasourceUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith("file:")) {
    const raw = envUrl.slice(5);
    // Absolute paths (e.g. /app/data/snippetvault.db in Docker or C:/... on Windows)
    if (path.isAbsolute(raw) || raw.startsWith("/")) {
      return envUrl;
    }
  }

  // Scoped to data directory to prevent wide filesystem tracing
  const defaultDbPath = path.join(process.cwd(), "data", "snippetvault.db");
  return `file:${defaultDbPath}`;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatasourceUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Enable SQLite WAL mode
prisma
  .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
  .catch(() => {});

export default prisma;
