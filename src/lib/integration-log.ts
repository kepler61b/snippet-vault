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
    if (customHeader.toLowerCase().includes("tabby")) {
      return "Tabby Terminal";
    }
  }

  const userAgent =
    uaString ||
    (request ? request.headers.get("user-agent") || "" : "");
  const lowerUa = userAgent.toLowerCase().trim();

  if (
    lowerUa.includes("snippetvault-tabby") ||
    lowerUa.includes("tabby")
  ) {
    return "Tabby Terminal";
  }

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

export function extractIntegrationVersion(
  request?: Request | NextRequest | null,
  uaString?: string | null
): string | null {
  if (request) {
    const versionHeader =
      request.headers.get("x-client-version") ||
      request.headers.get("x-snippetvault-client-version") ||
      request.headers.get("x-snippetvault-version") ||
      request.headers.get("x-version");
    if (versionHeader && versionHeader.trim()) {
      return versionHeader.trim().replace(/^v/i, "");
    }
  }

  const userAgent =
    uaString ||
    (request ? request.headers.get("user-agent") || "" : "");
  if (!userAgent) return null;

  // Patterns: "SnippetVault-Tabby/0.1.2", "SnippetVault-VSCode/0.1.0", "tabby-snippetvault/0.1.2", "vscode-snippetvault/0.1.0"
  const match = userAgent.match(
    /(?:SnippetVault[-_]?(?:VSCode|Tabby)|(?:vscode|tabby)[-_]?snippetvault)[/:\s]v?([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-zA-Z0-9.-]+)?)/i
  );
  if (match) {
    return match[1];
  }

  // Generic fallback if user-agent has a slash or colon version e.g. "Tabby/0.1.2"
  const genericMatch = userAgent.match(/(?:Tabby|VSCode|SnippetVault)[/:\s]v?([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
  if (genericMatch) {
    return genericMatch[1];
  }

  return null;
}

export async function recordIntegrationVersion(
  client: string,
  version: string,
  userId?: string | null
) {
  try {
    const cleanVer = version.trim().replace(/^v/i, "");
    if (!cleanVer) return;

    const lowerClient = client.toLowerCase();
    const key = lowerClient.includes("vscode") || lowerClient.includes("vs code")
      ? "integration_version_vscode"
      : lowerClient.includes("tabby")
      ? "integration_version_tabby"
      : null;

    if (!key) return;

    // Update global setting
    await prisma.setting.upsert({
      where: { key },
      update: { value: cleanVer },
      create: { key, value: cleanVer },
    });

    // Update per-user setting if userId is provided
    if (userId) {
      const userKey = `${key}_${userId}`;
      await prisma.setting.upsert({
        where: { key: userKey },
        update: { value: cleanVer },
        create: { key: userKey, value: cleanVer },
      });
    }
  } catch (err) {
    console.error("Failed to record integration version:", err);
  }
}

export async function recordClientVersionFromRequest(
  request: Request | NextRequest,
  userId?: string | null
) {
  try {
    const client = detectIntegrationClient(request);
    const version = extractIntegrationVersion(request);
    if (version) {
      await recordIntegrationVersion(client, version, userId);
    }
  } catch (err) {
    console.error("Failed to record client version from request:", err);
  }
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
  clientVersion,
  request,
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
  clientVersion?: string | null;
  request?: Request | NextRequest | null;
}) {
  try {
    // Automatically record client version if detected
    const ver = clientVersion || extractIntegrationVersion(request, userAgent);
    if (ver) {
      recordIntegrationVersion(client, ver, userId).catch(() => {});
    }

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
