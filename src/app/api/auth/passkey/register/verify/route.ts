import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getWebAuthnConfig,
  getPasskeyChallenge,
  clearPasskeyChallenge,
  uint8ArrayToBase64,
} from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const challengePayload = await getPasskeyChallenge();
    if (!challengePayload || challengePayload.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Срок действия запроса Passkey истек. Попробуйте снова." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { response, name } = body;

    if (!response) {
      return NextResponse.json(
        { success: false, error: "Отсутствует ответ WebAuthn" },
        { status: 400 }
      );
    }

    const { origin, rpID } = getWebAuthnConfig(request);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { success: false, error: "Не удалось подтвердить регистрацию Passkey" },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Check if credential ID is already registered
    const existing = await prisma.passkey.findUnique({
      where: { credentialId: credential.id },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Этот ключ доступа уже привязан к системе" },
        { status: 400 }
      );
    }

    const passkey = await prisma.passkey.create({
      data: {
        userId: user.id,
        name: (name && typeof name === "string" && name.trim()) || "Основной Passkey",
        credentialId: credential.id,
        publicKey: uint8ArrayToBase64(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    await clearPasskeyChallenge();

    return NextResponse.json({ success: true, passkey });
  } catch (error: any) {
    console.error("Passkey register verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка верификации Passkey" },
      { status: 500 }
    );
  }
}
