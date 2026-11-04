import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    await logAuditEvent({
      event: "SESSION_REVOKED",
      category: "SECURITY",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: user.id,
      targetEmail: user.email,
      details: "Admin revoked all active sessions for user",
      request,
    });

    return NextResponse.json({ success: true, message: "All sessions revoked" });
  } catch (error: any) {
    console.error("POST revoke sessions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
