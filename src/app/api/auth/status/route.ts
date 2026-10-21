import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const regDisabledSetting = await prisma.setting.findUnique({
      where: { key: "registration_disabled" },
    });

    const registrationDisabled = regDisabledSetting?.value === "true";

    return NextResponse.json({
      success: true,
      hasUsers: totalUsers > 0,
      totalUsers,
      registrationDisabled,
      localAdminEmail: "admin@snippetvault.local",
    });
  } catch (error: any) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch auth status",
        hasUsers: true,
        registrationDisabled: false,
      },
      { status: 500 }
    );
  }
}
