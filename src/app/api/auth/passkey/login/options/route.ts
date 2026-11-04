import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { getWebAuthnConfig, setPasskeyChallenge } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    let allowCredentials: any[] | undefined = undefined;
    let targetUserId: string | undefined = undefined;

    if (email && typeof email === "string") {
      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { passkeys: true },
      });
      if (user && user.passkeys.length > 0) {
        targetUserId = user.id;
        allowCredentials = user.passkeys.map((p) => ({
          id: p.credentialId,
          transports: p.transports ? JSON.parse(p.transports) : undefined,
        }));
      }
    }

    const { rpID } = getWebAuthnConfig(request);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "preferred",
    });

    await setPasskeyChallenge(options.challenge, targetUserId, request);

    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error("Passkey login options error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate passkey options" },
      { status: 500 }
    );
  }
}
