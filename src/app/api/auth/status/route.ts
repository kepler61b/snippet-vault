import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ensureSeedSnippets } from "@/lib/seed";

export async function GET() {
  try {
    await ensureSeedSnippets();

    const totalUsers = await prisma.user.count();
    const otherUsersCount = await prisma.user.count({
      where: {
        email: { not: "admin@snippetvault.local" },
      },
    });

    return NextResponse.json({
      success: true,
      totalUsers,
      otherUsersCount,
      showLocalAdminPrompt: otherUsersCount === 0,
      localAdminEmail: "admin@snippetvault.local",
    });
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check auth status" },
      { status: 500 }
    );
  }
}
