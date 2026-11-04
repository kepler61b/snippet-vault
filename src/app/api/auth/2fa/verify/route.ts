import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyToken, signToken, setSessionCookie } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json({ success: false, error: "Код и токен обязательны" }, { status: 400 });
    }

    const payload = await verifyToken<any>(tempToken);
    if (!payload?.userId || !payload?.temp2FA) {
      return NextResponse.json(
        { success: false, error: "Сессия двухфакторной аутентификации истекла" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { success: false, error: "2FA не настроена для данного пользователя" },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Неверный код доступа" }, { status: 400 });
    }

    const sessionToken = await signToken({
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    });

    await setSessionCookie(sessionToken, request);

    await logAuditEvent({
      event: "AUTH_LOGIN_SUCCESS",
      category: "AUTH",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetEmail: user.email,
      details: "Успешная двухфакторная аутентификация",
      request,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("POST 2fa verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка проверки 2FA" },
      { status: 500 }
    );
  }
}
