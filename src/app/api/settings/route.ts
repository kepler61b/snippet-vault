import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAISettings } from "@/lib/ai";

export async function GET() {
  try {
    const config = await getAISettings();
    // Mask API key for security
    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}`
        : "••••••••"
      : "";

    return NextResponse.json({
      success: true,
      settings: {
        provider: config.provider,
        hasApiKey: Boolean(config.apiKey),
        maskedKey,
        baseUrl: config.baseUrl,
        model: config.model,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, model } = body;

    const updates = [
      { key: "AI_PROVIDER", value: provider || "openai" },
      { key: "AI_BASE_URL", value: baseUrl || "https://api.openai.com/v1" },
      { key: "AI_MODEL", value: model || "gpt-4o-mini" },
    ];

    if (apiKey !== undefined && apiKey !== "") {
      updates.push({ key: "AI_API_KEY", value: apiKey });
    }

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error: any) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
