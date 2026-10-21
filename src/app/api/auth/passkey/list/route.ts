import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const passkeys = await prisma.passkey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, passkeys });
  } catch (error: any) {
    console.error("Passkey list error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения списка Passkeys" },
      { status: 500 }
    );
  }
}
