import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWebAuthnConfig, setPasskeyChallenge } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { rpName, rpID } = getWebAuthnConfig(request);

    const userPasskeys = await prisma.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });

    const excludeCredentials = userPasskeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports ? JSON.parse(p.transports) : undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id, "utf-8"),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await setPasskeyChallenge(options.challenge, user.id, request);

    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error("Passkey register options error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate passkey registration options" },
      { status: 500 }
    );
  }
}
