import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./db";
import { COOKIE_NAME, verifyToken, SessionPayload } from "./jwt";

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

export async function getCurrentUser() {
  try {
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
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user || user.isBanned) return null;

    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
