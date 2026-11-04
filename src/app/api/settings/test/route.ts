import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeAIRequestWithConfig } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { provider, apiKey, baseUrl, model, proxyUrl } = body;

    const response = await executeAIRequestWithConfig(
      {
        provider: provider || "openai",
        apiKey: apiKey || "",
        baseUrl: baseUrl || "",
        model: model || "",
        proxyUrl: proxyUrl || "",
      },
      "You are a test assistant.",
      "Reply with 'OK' only."
    );

    return NextResponse.json({
      success: true,
      message: response.trim() || "OK",
    });
  } catch (error: any) {
    console.error("POST settings/test error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Connection test failed" },
      { status: 400 }
    );
  }
}
