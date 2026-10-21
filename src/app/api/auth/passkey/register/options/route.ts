import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWebAuthnConfig, setPasskeyChallenge } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { rpName, rpID } = getWebAuthnConfig(request);

    // Get user's existing passkeys to prevent re-registering the same authenticator
    const existingPasskeys = await prisma.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports ? JSON.parse(p.transports) : undefined,
      })),
    });

    // Store challenge in signed temporary cookie
    await setPasskeyChallenge(options.challenge, user.id);

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error("Passkey register options error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка генерации параметров Passkey" },
      { status: 500 }
    );
  }
}
