import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: "Password required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !verifyPassword(password, dbUser.passwordHash)) {
      return NextResponse.json({ success: false, error: "Неверный пароль" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await logAuditEvent({
      event: "AUTH_2FA_DISABLE",
      category: "SECURITY",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetEmail: user.email,
      details: "Two-factor authentication disabled",
      request,
    });

    return NextResponse.json({ success: true, message: "2FA disabled" });
  } catch (error: any) {
    console.error("POST 2fa disable error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
