import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { revokeUserPat } from "@/lib/pat";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const revoked = await revokeUserPat(currentUser.id, id);

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Token revoked" });
  } catch (error: any) {
    console.error("Error revoking token:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke token" },
      { status: 500 }
    );
  }
}
