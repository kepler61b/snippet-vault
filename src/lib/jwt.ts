const SECRET_KEY =
  process.env.SESSION_SECRET ||
  "snippetvault-super-secure-session-secret-change-in-prod";

export const COOKIE_NAME = "snippetvault_session";

export interface SessionPayload {
  userId: string;
  email: string;
  tokenVersion?: number;
  exp: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signToken(payload: any, expiresInSeconds = 7 * 24 * 3600): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  const enc = new TextEncoder();
  const encodedPayload = bytesToBase64Url(enc.encode(JSON.stringify(fullPayload)));

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(encodedPayload)
  );

  const signature = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${encodedPayload}.${signature}`;
}

export async function verifyToken<T = any>(token: string): Promise<T | null> {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = base64UrlToBytes(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      enc.encode(encodedPayload)
    );

    if (!isValid) return null;

    const dec = new TextDecoder();
    const payload = JSON.parse(dec.decode(base64UrlToBytes(encodedPayload)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload as T;
  } catch {
    return null;
  }
}
