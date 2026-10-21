import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createTwoFactorSetup, verifyTOTP } from "@/lib/totp";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const setup = await createTwoFactorSetup(user.email);
    return NextResponse.json({
      success: true,
      secret: setup.secret,
      qrCode: setup.qrCodeDataUrl,
      otpauthUrl: setup.otpauthUrl,
    });
  } catch (error: any) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка настройки 2FA" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { success: false, error: "Укажите секретный ключ и код подтверждения" },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(secret, code.trim());
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Неверный код доступа. Проверьте правильность ввода из приложения аутентификатора." },
        { status: 400 }
      );
    }

    // Save secret and enable 2FA permanently
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Двухфакторная аутентификация успешно подключена!",
    });
  } catch (error: any) {
    console.error("2FA enable error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка подключения 2FA" },
      { status: 500 }
    );
  }
}
