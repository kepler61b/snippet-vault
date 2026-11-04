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
    if (id === admin.id) {
      return NextResponse.json({ success: false, error: "Cannot ban yourself" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const isBanned = typeof body.isBanned === "boolean" ? body.isBanned : !user.isBanned;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isBanned,
        tokenVersion: isBanned ? { increment: 1 } : undefined,
      },
    });

    await logAuditEvent({
      event: isBanned ? "ADMIN_USER_BAN" : "ADMIN_USER_UNBAN",
      category: "ADMIN",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: user.id,
      targetEmail: user.email,
      details: isBanned ? "User was banned" : "User was unbanned",
      request,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        isBanned: updated.isBanned,
      },
    });
  } catch (error: any) {
    console.error("POST admin user ban error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update ban status" },
      { status: 500 }
    );
  }
}
