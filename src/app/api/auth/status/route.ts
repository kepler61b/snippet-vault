import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const otherUsersCount = await prisma.user.count({
      where: {
        email: {
          not: "admin@snippetvault.local",
        },
      },
    });

    // Show local admin prompt if no other accounts exist besides local administrator
    const showLocalAdminPrompt = otherUsersCount === 0;

    return NextResponse.json({
      success: true,
      showLocalAdminPrompt,
      otherUsersCount,
      totalUsers,
      localAdminEmail: "admin@snippetvault.local",
    });
  } catch (error: any) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch auth status",
        showLocalAdminPrompt: false,
        otherUsersCount: 0,
        totalUsers: 0,
      },
      { status: 500 }
    );
  }
}
