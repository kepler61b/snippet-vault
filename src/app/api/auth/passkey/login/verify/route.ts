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
    const challengePayload = await getPasskeyChallenge();
    if (!challengePayload) {
      return NextResponse.json(
        { success: false, error: "Срок действия попытки входа истек. Попробуйте еще раз." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { response } = body;

    if (!response || !response.id) {
      return NextResponse.json(
        { success: false, error: "Некорректный ответ Passkey" },
        { status: 400 }
      );
    }

    // Locate the passkey in database
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId: response.id },
      include: { user: true },
    });

    if (!passkey || !passkey.user) {
      return NextResponse.json(
        { success: false, error: "Ключ доступа не зарегистрирован в системе" },
        { status: 404 }
      );
    }

    const { origin, rpID } = getWebAuthnConfig(request);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: base64ToUint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, error: "Ошибка верификации ключа доступа" },
        { status: 400 }
      );
    }

    // Update counter and lastUsedAt
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Sign session token and set session cookie
    const token = await signToken({
      userId: passkey.user.id,
      email: passkey.user.email,
    });

    await setSessionCookie(token, request);
    await clearPasskeyChallenge();

    return NextResponse.json({
      success: true,
      user: {
        id: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
        bio: passkey.user.bio,
        twoFactorEnabled: passkey.user.twoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error("Passkey login verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка входа через Passkey" },
      { status: 500 }
    );
  }
}
