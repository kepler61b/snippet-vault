import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/db";
import { getWebAuthnConfig, setPasskeyChallenge } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  try {
    let email: string | undefined;
    try {
      const body = await request.json();
      email = body.email ? body.email.trim().toLowerCase() : undefined;
    } catch {
      // Body may be empty if discoverable credentials / 1-click passkey login is requested
    }

    const { rpID } = getWebAuthnConfig(request);

    let allowCredentials:
      | { id: string; transports?: any[] }[]
      | undefined = undefined;

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { passkeys: true },
      });
      if (user && user.passkeys.length > 0) {
        allowCredentials = user.passkeys.map((p) => ({
          id: p.credentialId,
          transports: p.transports ? JSON.parse(p.transports) : undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    await setPasskeyChallenge(options.challenge);

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error("Passkey login options error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка генерации параметров входа Passkey" },
      { status: 500 }
    );
  }
}
