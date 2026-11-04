import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";
import {
  getWebAuthnConfig,
  getPasskeyChallenge,
  clearPasskeyChallenge,
  base64ToUint8Array,
} from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeData = await getPasskeyChallenge();

    if (!challengeData || !challengeData.challenge) {
      return NextResponse.json(
        { success: false, error: "Сессия авторизации Passkey истекла. Попробуйте снова." },
        { status: 400 }
      );
    }

    const { id: credentialId } = body;
    if (!credentialId) {
      return NextResponse.json(
        { success: false, error: "Отсутствует идентификатор ключа" },
        { status: 400 }
      );
    }

    const passkey = await prisma.passkey.findUnique({
      where: { credentialId },
      include: { user: true },
    });

    if (!passkey || !passkey.user) {
      return NextResponse.json(
        { success: false, error: "Passkey не найден в системе" },
        { status: 404 }
      );
    }

    const { rpID, origin } = getWebAuthnConfig(request);

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: base64ToUint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, error: "Проверка подлинности Passkey не удалась" },
        { status: 400 }
      );
    }

    // Update counter and last used
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    await clearPasskeyChallenge();

    const token = await signToken({
      userId: passkey.user.id,
      email: passkey.user.email,
      tokenVersion: passkey.user.tokenVersion ?? 0,
    });

    await setSessionCookie(token, request);

    return NextResponse.json({
      success: true,
      user: {
        id: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
        role: passkey.user.role,
      },
    });
  } catch (error: any) {
    console.error("Passkey login verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка верификации Passkey" },
      { status: 500 }
    );
  }
}
