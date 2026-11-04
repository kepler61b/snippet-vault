import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const token = await prisma.personalAccessToken.findUnique({
      where: { id },
    });

    if (!token) {
      return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
    }

    // Only allow token owner or ADMIN
    if (token.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.personalAccessToken.delete({ where: { id } });

    await logAuditEvent({
      event: "TOKEN_REVOKE",
      category: "SECURITY",
      actorId: user.id,
      actorEmail: user.email,
      targetId: token.userId,
      details: `User revoked token: ${token.name} (${token.tokenPrefix})`,
      request,
    });

    return NextResponse.json({ success: true, message: "Token revoked" });
  } catch (error: any) {
    console.error("DELETE token error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke token" },
      { status: 500 }
    );
  }
}
