import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generatePat } from "@/lib/pat";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const tokens = await prisma.personalAccessToken.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isBanned: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error: any) {
    console.error("Error fetching admin tokens:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId, name, expiresInDays } = body;

    if (!userId || !name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Укажите пользователя и название токена" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const { rawToken, pat } = await generatePat({
      userId,
      name,
      expiresInDays: expiresInDays ? Number(expiresInDays) : null,
    });

    return NextResponse.json({
      success: true,
      token: rawToken,
      pat: {
        ...pat,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Error issuing admin token:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to issue token" },
      { status: 500 }
    );
  }
}
