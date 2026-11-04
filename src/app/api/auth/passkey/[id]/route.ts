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
    const passkey = await prisma.passkey.findUnique({
      where: { id },
    });

    if (!passkey) {
      return NextResponse.json({ success: false, error: "Passkey not found" }, { status: 404 });
    }

    if (passkey.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.passkey.delete({ where: { id } });

    await logAuditEvent({
      event: "AUTH_PASSKEY_DELETE",
      category: "SECURITY",
      actorId: user.id,
      actorEmail: user.email,
      targetId: passkey.userId,
      details: `Passkey deleted: ${passkey.name}`,
      request,
    });

    return NextResponse.json({ success: true, message: "Passkey deleted" });
  } catch (error: any) {
    console.error("DELETE passkey error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete passkey" },
      { status: 500 }
    );
  }
}
