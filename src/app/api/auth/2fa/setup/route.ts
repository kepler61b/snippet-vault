import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createTwoFactorSetup, verifyTOTP } from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const setup = await createTwoFactorSetup(user.email);

    return NextResponse.json({
      success: true,
      ...setup,
    });
  } catch (error: any) {
    console.error("GET 2fa setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate 2FA setup" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json({ success: false, error: "Secret and code required" }, { status: 400 });
    }

    const isValid = verifyTOTP(secret, code);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Неверный код подтверждения" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    await logAuditEvent({
      event: "AUTH_2FA_SETUP",
      category: "SECURITY",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetEmail: user.email,
      details: "Two-factor authentication enabled",
      request,
    });

    return NextResponse.json({ success: true, message: "2FA enabled" });
  } catch (error: any) {
    console.error("POST 2fa setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
