import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePat, listUserPats, revokeUserPat, getPatPolicies, validatePatExpiration } from "@/lib/pat";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [tokens, policies] = await Promise.all([
      listUserPats(currentUser.id),
      getPatPolicies(),
    ]);

    return NextResponse.json({ success: true, tokens, policies });
  } catch (error: any) {
    console.error("Error listing tokens:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Token name is required" },
        { status: 400 }
      );
    }

    const expiresInDays =
      typeof body.expiresInDays === "number" && body.expiresInDays > 0
        ? body.expiresInDays
        : null;

    // Check PAT security policies
    const policies = await getPatPolicies();
    const validation = validatePatExpiration(expiresInDays, policies);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { rawToken, pat } = await generatePat({
      userId: currentUser.id,
      name,
      expiresInDays,
    });

    return NextResponse.json(
      {
        success: true,
        token: rawToken,
        pat,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating token:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create token" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Token ID is required" },
        { status: 400 }
      );
    }

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
