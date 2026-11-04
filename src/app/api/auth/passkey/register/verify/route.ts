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
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { response, name } = body;

    const challengeData = await getPasskeyChallenge();
    if (!challengeData || !challengeData.challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge expired or invalid" },
        { status: 400 }
      );
    }

    const { rpID, origin } = getWebAuthnConfig(request);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { success: false, error: "Passkey verification failed" },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const newPasskey = await prisma.passkey.create({
      data: {
        userId: user.id,
        name: name ? String(name).trim() : "Passkey",
        credentialId: credential.id,
        publicKey: uint8ArrayToBase64(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
      },
    });

    await clearPasskeyChallenge();

    await logAuditEvent({
      event: "AUTH_PASSKEY_REGISTER",
      category: "SECURITY",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetEmail: user.email,
      details: `Passkey registered: ${newPasskey.name}`,
      request,
    });

    return NextResponse.json({
      success: true,
      passkey: {
        id: newPasskey.id,
        name: newPasskey.name,
      },
    });
  } catch (error: any) {
    console.error("Passkey register verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify passkey registration" },
      { status: 500 }
    );
  }
}
