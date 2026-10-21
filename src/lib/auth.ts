import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "./db";

const SECRET_KEY =
  process.env.SESSION_SECRET ||
  "snippetvault-super-secure-session-secret-change-in-prod";
export const COOKIE_NAME = "snippetvault_session";

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

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

export function signToken(payload: any, expiresInSeconds = 7 * 24 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    if (!token || !token.includes(".")) return null;
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(encodedPayload)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload as T;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken<SessionPayload>(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}
