import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { role, name, bio } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.id === admin.id && role === "USER") {
      return NextResponse.json(
        { success: false, error: "Cannot demote yourself" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role && (role === "ADMIN" || role === "USER")) {
      updateData.role = role;
    }
    if (typeof name !== "undefined") {
      updateData.name = name ? String(name).trim() : null;
    }
    if (typeof bio !== "undefined") {
      updateData.bio = bio ? String(bio).trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        role: true,
        isBanned: true,
        updatedAt: true,
      },
    });

    if (role && role !== user.role) {
      await logAuditEvent({
        event: "ADMIN_ROLE_CHANGE",
        category: "ADMIN",
        actorId: admin.id,
        actorEmail: admin.email,
        targetId: user.id,
        targetEmail: user.email,
        details: `Role changed from ${user.role} to ${role}`,
        request,
      });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("PATCH admin user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const newHash = hashPassword(password);
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    await logAuditEvent({
      event: "ADMIN_PASSWORD_RESET",
      category: "SECURITY",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: user.id,
      targetEmail: user.email,
      details: "Admin reset user password and revoked sessions",
      request,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("PUT admin user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (id === admin.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    await logAuditEvent({
      event: "ADMIN_USER_DELETE",
      category: "ADMIN",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: user.id,
      targetEmail: user.email,
      details: `User deleted: ${user.email}`,
      request,
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error: any) {
    console.error("DELETE admin user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
