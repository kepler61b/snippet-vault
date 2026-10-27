import prisma from "./db";
import { extractClientIp } from "./integration-log";
import { NextRequest } from "next/server";

export type AuditEvent =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAIL"
  | "AUTH_LOGOUT"
  | "AUTH_2FA_SETUP"
  | "AUTH_2FA_DISABLE"
  | "AUTH_PASSKEY_REGISTER"
  | "AUTH_PASSKEY_DELETE"
  | "PASSWORD_CHANGE"
  | "ADMIN_USER_CREATE"
  | "ADMIN_USER_DELETE"
  | "ADMIN_USER_BAN"
  | "ADMIN_USER_UNBAN"
  | "ADMIN_ROLE_CHANGE"
  | "ADMIN_PASSWORD_RESET"
  | "TOKEN_CREATE"
  | "TOKEN_REVOKE"
  | "SESSION_REVOKED"
  | "CONTENT_TRANSFER"
  | "DATABASE_VACUUM"
  | "SETTINGS_CHANGE";

export type AuditCategory = "AUTH" | "SECURITY" | "ADMIN" | "API";
export type AuditStatus = "SUCCESS" | "FAILURE" | "WARNING" | "INFO";

export async function logAuditEvent({
  event,
  category,
  status = "SUCCESS",
  actorId,
  actorEmail,
  targetId,
  targetEmail,
  ip,
  userAgent,
  details,
  request,
}: {
  event: AuditEvent | string;
  category: AuditCategory;
  status?: AuditStatus;
  actorId?: string | null;
  actorEmail?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: string | null;
  request?: Request | NextRequest | null;
}) {
  try {
    const finalIp = ip || (request ? extractClientIp(request) : null);
    const finalUa = userAgent || (request ? request.headers.get("user-agent") : null);

    await prisma.auditLog.create({
      data: {
        event,
        category,
        status,
        actorId: actorId || null,
        actorEmail: actorEmail || null,
        targetId: targetId || null,
        targetEmail: targetEmail || null,
        ip: finalIp || null,
        userAgent: finalUa ? finalUa.slice(0, 255) : null,
        details: details || null,
      },
    });

    // Auto-prune old audit logs if they exceed 2000 records
    const count = await prisma.auditLog.count();
    if (count > 2200) {
      const oldest = await prisma.auditLog.findMany({
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { id: { in: oldest.map((l) => l.id) } },
        });
      }
    }
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
