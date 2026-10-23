import { NextRequest, NextResponse } from "next/server";
import { executeAIRequestWithConfig } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { provider, apiKey, baseUrl, model, proxyUrl } = body;

    // Auto-detect provider if user supplied Gemini key or model
    if (provider === "openai" && (model?.toLowerCase().includes("gemini") || apiKey?.startsWith("AIzaSy"))) {
      provider = "gemini";
    }

    if (!apiKey && provider !== "custom") {
      return NextResponse.json(
        {
          success: false,
          error: "API ключ не указан. Пожалуйста, вставьте ваш API ключ.",
        },
        { status: 400 }
      );
    }

    const startTime = performance.now();
    const reply = await executeAIRequestWithConfig(
      {
        provider: provider || "openai",
        apiKey: apiKey?.trim() || "",
        baseUrl: baseUrl?.trim() || (provider === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.openai.com/v1"),
        model: model?.trim() || (provider === "gemini" ? "gemini-3.5-flash" : "gpt-4o-mini"),
        proxyUrl: proxyUrl !== undefined ? String(proxyUrl).trim() : undefined,
      },
      "Ты тестовый ассистент. Ответь одним коротким словом: OK.",
      "Тест подключения."
    );

    const latency = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      latency,
      reply: reply.slice(0, 100),
    });
  } catch (error: any) {
    console.error("AI Test Connection Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Не удалось установить соединение с AI сервисом",
      },
      { status: 500 }
    );
  }
}
