import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./db";
import { COOKIE_NAME, verifyToken, SessionPayload } from "./jwt";
import { verifyPat } from "./pat";
import { logIntegrationActivity, detectIntegrationClient, extractClientIp } from "./integration-log";

export * from "./jwt";

export function isRequestSecure(request?: NextRequest): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  if (!request) return false;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function setSessionCookie(token: string, request?: NextRequest) {
  const cookieStore = await cookies();
  const secure = isRequestSecure(request);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secure,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600, // 7 days
  });
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, hash] = combinedHash.split(":");
    if (!salt || !hash) return false;
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

export async function getCurrentUser(request?: Request | NextRequest) {
  try {
    // 1. Check Authorization or x-api-key header
    let authHeader: string | null = null;
    if (request) {
      authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
    } else {
      try {
        const headerStore = await headers();
        authHeader = headerStore.get("authorization") || headerStore.get("x-api-key");
      } catch {
        // headers() might throw in environments without request headers
      }
    }

    if (authHeader) {
      const cleanToken = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : authHeader.trim();

      // Check Personal Access Token
      if (cleanToken.startsWith("sv_pat_")) {
        const patUser = await verifyPat(cleanToken);
        if (patUser) return patUser;

        // Log failed PAT authentication
        logIntegrationActivity({
          client: detectIntegrationClient(request),
          action: "Token authentication failed",
          method: request?.method || "GET",
          path: request instanceof NextRequest ? request.nextUrl.pathname : "/api",
          status: 401,
          details: "Invalid or expired Personal Access Token",
          tokenPrefix: `${cleanToken.slice(0, 11)}...${cleanToken.slice(-4)}`,
          ip: extractClientIp(request),
          userAgent: request?.headers.get("user-agent") || null,
        }).catch(() => {});

        // If an explicit PAT was provided but invalid/expired, do not fallback to cookie
        return null;
      }

      // Check JWT token passed via Bearer header
      if (cleanToken.includes(".")) {
        const payload = await verifyToken<SessionPayload>(cleanToken);
        if (payload?.userId) {
          const jwtUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              email: true,
              name: true,
              bio: true,
              role: true,
              isBanned: true,
              tokenVersion: true,
              twoFactorEnabled: true,
              createdAt: true,
            },
          });
          if (jwtUser && !jwtUser.isBanned) {
            // Check session kill switch
            const userVersion = jwtUser.tokenVersion ?? 0;
            if (payload.tokenVersion !== undefined && payload.tokenVersion !== userVersion) {
              return null;
            }
            if (payload.tokenVersion === undefined && userVersion > 0) {
              return null;
            }
            return jwtUser;
          }
        }
      }
    }

    // 2. Check Cookie session
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken<SessionPayload>(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        role: true,
        isBanned: true,
        tokenVersion: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user || user.isBanned) return null;

    // Check session kill switch
    const userVersion = user.tokenVersion ?? 0;
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== userVersion) {
      return null;
    }
    if (payload.tokenVersion === undefined && userVersion > 0) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin(request?: Request | NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
