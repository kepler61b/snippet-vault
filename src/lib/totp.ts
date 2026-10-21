import crypto from "crypto";
import QRCode from "qrcode";

// Base32 alphabet for TOTP
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  let secret = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTOTP(secret: string, step = 30, time = Date.now()): string {
  const counter = Math.floor(time / 1000 / step);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, "0");
}

export function verifyTOTP(
  secret: string,
  userCode: string,
  window = 1
): boolean {
  if (!userCode || userCode.trim().length !== 6) return false;
  const cleanCode = userCode.trim();
  const now = Date.now();
  const step = 30;

  // Check window: previous, current, next 30s block
  for (let i = -window; i <= window; i++) {
    const time = now + i * step * 1000;
    const generated = generateTOTP(secret, step, time);
    if (generated === cleanCode) {
      return true;
    }
  }

  return false;
}

export async function createTwoFactorSetup(userEmail: string) {
  const secret = generateBase32Secret(20);
  const issuer = "SnippetVault";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(
    issuer
  )}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(
    issuer
  )}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 240,
    margin: 2,
    color: {
      dark: "#ffffff",
      light: "#09090b",
    },
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}
