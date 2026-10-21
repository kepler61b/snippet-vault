import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "./jwt";

export const PASSKEY_CHALLENGE_COOKIE = "snippetvault_passkey_challenge";

export interface ChallengePayload {
  challenge: string;
  userId?: string;
  exp: number;
}

/**
 * Derives RP ID, RP Name, and Origin from the incoming HTTP request.
 */
export function getWebAuthnConfig(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";

  // Determine protocol: x-forwarded-proto or request.nextUrl.protocol
  let proto = request.headers.get("x-forwarded-proto");
  if (!proto) {
    proto = request.nextUrl.protocol ? request.nextUrl.protocol.replace(":", "") : "http";
  }

  // RP ID is domain without port (e.g. "localhost", "example.com", "192.168.1.100")
  const hostname = host.split(":")[0];

  // Origin is full URL with protocol and host (e.g. "http://localhost:3000", "https://nas.domain.com")
  const origin = `${proto}://${host}`;

  return {
    rpName: "SnippetVault",
    rpID: hostname,
    origin,
  };
}

/**
 * Stores temporary challenge in an encrypted/signed short-lived HTTP-only cookie (5 minutes)
 */
export async function setPasskeyChallenge(challenge: string, userId?: string, request?: NextRequest) {
  const token = await signToken({ challenge, userId }, 300);
  const cookieStore = await cookies();
  const forwardedProto = request?.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || request?.nextUrl.protocol === "https:";
  const secure = process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && isHttps);

  cookieStore.set(PASSKEY_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: secure,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

/**
 * Retrieves and verifies the stored passkey challenge from cookie
 */
export async function getPasskeyChallenge(): Promise<ChallengePayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyToken<ChallengePayload>(token);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Clears the temporary challenge cookie after verification
 */
export async function clearPasskeyChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(PASSKEY_CHALLENGE_COOKIE);
}

/**
 * Utility: Converts Base64 string to Uint8Array for SimpleWebAuthn
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Utility: Converts Uint8Array to Base64 string for database storage
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
