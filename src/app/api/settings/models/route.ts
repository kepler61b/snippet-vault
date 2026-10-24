import { NextRequest, NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, proxyUrl } = body;

    const models = await listAvailableModels({
      provider,
      apiKey: apiKey !== undefined ? String(apiKey).trim() : undefined,
      baseUrl: baseUrl !== undefined ? String(baseUrl).trim() : undefined,
      proxyUrl: proxyUrl !== undefined ? String(proxyUrl).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error: any) {
    console.error("AI Models Fetch Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Не удалось получить список моделей",
      },
      { status: 500 }
    );
  }
}
