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

  // Determine protocol: x-forwarded-proto or fallback based on localhost
  let proto = request.headers.get("x-forwarded-proto");
  if (!proto) {
    proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  }

  // RP ID is domain without port (e.g. "localhost", "example.com")
  const hostname = host.split(":")[0];

  // Origin is full URL with protocol and host (e.g. "http://localhost:3000")
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
export async function setPasskeyChallenge(challenge: string, userId?: string) {
  const token = await signToken({ challenge, userId }, 300);
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
 * Clears the temporary challenge cookie
 */
export async function clearPasskeyChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(PASSKEY_CHALLENGE_COOKIE);
}

/**
 * Converts a Uint8Array / Buffer to Base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Converts Base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(base64, "base64");
  const ab = new ArrayBuffer(buf.byteLength);
  const uint8 = new Uint8Array(ab);
  uint8.set(buf);
  return uint8;
}
