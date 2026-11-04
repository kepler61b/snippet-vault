import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAvailableModels } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { provider, apiKey, baseUrl, proxyUrl } = body;

    const models = await listAvailableModels({
      provider,
      apiKey,
      baseUrl,
      proxyUrl,
    });

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error: any) {
    console.error("POST settings/models error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load models" },
      { status: 400 }
    );
  }
}
