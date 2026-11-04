import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const passkeys = await prisma.passkey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      passkeys,
    });
  } catch (error: any) {
    console.error("GET passkeys list error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load passkeys" },
      { status: 500 }
    );
  }
}
