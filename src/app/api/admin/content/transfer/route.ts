import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { fromUserId, toUserId, transferSnippets = true, transferCollections = true } = body;

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { success: false, error: "fromUserId and toUserId are required" },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { success: false, error: "Source and target users cannot be the same" },
        { status: 400 }
      );
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json(
        { success: false, error: "One or both users not found" },
        { status: 404 }
      );
    }

    let transferredSnippets = 0;
    let transferredCollections = 0;

    if (transferSnippets) {
      const res = await prisma.snippet.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      });
      transferredSnippets = res.count;
    }

    if (transferCollections) {
      const res = await prisma.collection.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      });
      transferredCollections = res.count;
    }

    await logAuditEvent({
      event: "CONTENT_TRANSFER",
      category: "ADMIN",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: toUserId,
      targetEmail: toUser.email,
      details: `Transferred ${transferredSnippets} snippets and ${transferredCollections} collections from ${fromUser.email} to ${toUser.email}`,
      request,
    });

    return NextResponse.json({
      success: true,
      transferredSnippets,
      transferredCollections,
    });
  } catch (error: any) {
    console.error("POST content transfer error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to transfer content" },
      { status: 500 }
    );
  }
}
