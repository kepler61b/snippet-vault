import { NextRequest } from "next/server";
import prisma from "./db";

export function detectIntegrationClient(
  request?: Request | NextRequest | null,
  uaString?: string | null
): string {
  if (request) {
    const customHeader =
      request.headers.get("x-client") ||
      request.headers.get("x-snippetvault-client") ||
      request.headers.get("x-source") ||
      "";
    if (customHeader.toLowerCase().includes("vscode")) {
      return "VS Code Extension";
    }
  }

  const userAgent =
    uaString ||
    (request ? request.headers.get("user-agent") || "" : "");
  const lowerUa = userAgent.toLowerCase().trim();

  if (
    lowerUa.includes("snippetvault-vscode") ||
    lowerUa.includes("vscode") ||
    lowerUa.includes("visual studio code") ||
    lowerUa === "node" ||
    lowerUa.startsWith("node/") ||
    lowerUa.startsWith("node-") ||
    lowerUa.includes("undici")
  ) {
    return "VS Code Extension";
  }
  if (lowerUa.includes("curl")) {
    return "cURL / Terminal";
  }
  if (lowerUa.includes("wget")) {
    return "Wget / Terminal";
  }
  if (lowerUa.includes("postman")) {
    return "Postman";
  }
  if (lowerUa.includes("python-requests") || lowerUa.includes("python")) {
    return "Python Script";
  }
  if (lowerUa.includes("insomnia")) {
    return "Insomnia";
  }
  if (lowerUa.includes("httpie")) {
    return "HTTPie";
  }
  return "REST API / CLI";
}

export function extractTokenPrefix(request?: Request | NextRequest | null): string | null {
  if (!request) return null;
  const auth = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!auth) return null;
  const token = auth.startsWith("Bearer ") ? auth.substring(7).trim() : auth.trim();
  if (token.startsWith("sv_pat_") && token.length >= 15) {
    return `${token.slice(0, 10)}...${token.slice(-4)}`;
  }
  return null;
}

export function extractClientIp(request?: Request | NextRequest | null): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}

export async function logIntegrationActivity({
  client,
  action,
  method,
  path,
  status,
  details,
  tokenPrefix,
  ip,
  userAgent,
  userId,
}: {
  client: string;
  action: string;
  method: string;
  path: string;
  status: number;
  details?: string | null;
  tokenPrefix?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
}) {
  try {
    await prisma.integrationLog.create({
      data: {
        client,
        action,
        method,
        path,
        status,
        details: details || null,
        tokenPrefix: tokenPrefix || null,
        ip: ip || null,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
        userId: userId || null,
      },
    });

    // Keep log table light: prune logs older than 500 records per user or total
    const count = await prisma.integrationLog.count();
    if (count > 600) {
      const oldest = await prisma.integrationLog.findMany({
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.integrationLog.deleteMany({
          where: { id: { in: oldest.map((l) => l.id) } },
        });
      }
    }
  } catch (err) {
    console.error("Failed to write integration log:", err);
  }
}
