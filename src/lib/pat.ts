import crypto from "crypto";
import prisma from "./db";

export interface PatListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface PatPolicies {
  denyNeverExpires: boolean;
  maxDays: number;
}

export async function getPatPolicies(): Promise<PatPolicies> {
  try {
    const [denyNeverSetting, maxDaysSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "pat_deny_never_expires" } }),
      prisma.setting.findUnique({ where: { key: "pat_max_days" } }),
    ]);

    return {
      denyNeverExpires: denyNeverSetting?.value === "true",
      maxDays: maxDaysSetting ? parseInt(maxDaysSetting.value, 10) || 0 : 0,
    };
  } catch {
    return { denyNeverExpires: false, maxDays: 0 };
  }
}

export function validatePatExpiration(
  expiresInDays: number | null,
  policies: PatPolicies
): { valid: boolean; error?: string } {
  if (policies.denyNeverExpires && (!expiresInDays || expiresInDays <= 0)) {
    return {
      valid: false,
      error: "Создание бессрочных токенов запрещено политикой безопасности сервера. Выберите срок действия.",
    };
  }
  if (policies.maxDays > 0) {
    if (!expiresInDays || expiresInDays <= 0 || expiresInDays > policies.maxDays) {
      return {
        valid: false,
        error: `Максимальный срок действия токена ограничен политикой безопасности: ${policies.maxDays} дн.`,
      };
    }
  }
  return { valid: true };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generatePat({
  userId,
  name,
  expiresInDays,
}: {
  userId: string;
  name: string;
  expiresInDays?: number | null;
}) {
  const randomHex = crypto.randomBytes(24).toString("hex");
  const rawToken = `sv_pat_${randomHex}`;
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = `sv_pat_${randomHex.slice(0, 4)}...${randomHex.slice(-4)}`;

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const pat = await prisma.personalAccessToken.create({
    data: {
      name: name.trim(),
      tokenHash,
      tokenPrefix,
      userId,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    rawToken,
    pat,
  };
}

export async function verifyPat(rawToken: string) {
  try {
    const trimmed = rawToken.trim();
    if (!trimmed.startsWith("sv_pat_")) return null;

    const tokenHash = hashToken(trimmed);
    const pat = await prisma.personalAccessToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
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
        },
      },
    });

    if (!pat || !pat.user || pat.user.isBanned) {
      return null;
    }

    if (pat.expiresAt && pat.expiresAt.getTime() < Date.now()) {
      return null;
    }

    // Update lastUsedAt in the background
    prisma.personalAccessToken
      .update({
        where: { id: pat.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.error("Failed to update PAT lastUsedAt:", err);
      });

    return pat.user;
  } catch (error) {
    console.error("Error verifying PAT:", error);
    return null;
  }
}

export async function listUserPats(userId: string): Promise<PatListItem[]> {
  return prisma.personalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function revokeUserPat(userId: string, patId: string): Promise<boolean> {
  const existing = await prisma.personalAccessToken.findFirst({
    where: { id: patId, userId },
  });

  if (!existing) return false;

  await prisma.personalAccessToken.delete({
    where: { id: patId },
  });

  return true;
}
