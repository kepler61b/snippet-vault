import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const token = await prisma.personalAccessToken.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!token) {
      return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
    }

    await prisma.personalAccessToken.delete({ where: { id } });

    await logAuditEvent({
      event: "TOKEN_REVOKE",
      category: "SECURITY",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: token.userId,
      targetEmail: token.user.email,
      details: `Admin revoked token: ${token.name} (${token.tokenPrefix})`,
      request,
    });

    return NextResponse.json({ success: true, message: "Token revoked" });
  } catch (error: any) {
    console.error("DELETE admin token error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke token" },
      { status: 500 }
    );
  }
}
