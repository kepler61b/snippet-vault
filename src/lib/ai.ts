import { prisma } from "./db";

export interface AISettings {
  provider: "openai" | "gemini" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const records = await prisma.setting.findMany({
      where: {
        key: {
          in: ["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL"],
        },
      },
    });

    const map = new Map<string, string>();
    for (const r of records) {
      map.set(r.key, r.value);
    }

    return {
      provider: (map.get("AI_PROVIDER") || process.env.AI_PROVIDER || "openai") as AISettings["provider"],
      apiKey: map.get("AI_API_KEY") || process.env.AI_API_KEY || "",
      baseUrl: map.get("AI_BASE_URL") || process.env.AI_BASE_URL || "https://api.openai.com/v1",
      model: map.get("AI_MODEL") || process.env.AI_MODEL || "gpt-4o-mini",
    };
  } catch {
    return {
      provider: (process.env.AI_PROVIDER || "openai") as AISettings["provider"],
      apiKey: process.env.AI_API_KEY || "",
      baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.AI_MODEL || "gpt-4o-mini",
    };
  }
}

export async function executeAIRequest(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = await getAISettings();

  if (!config.apiKey && config.provider !== "custom") {
    const error: any = new Error("AI API ключ не настроен. Пожалуйста, укажите ваш API ключ в настройках приложения или через переменные окружения (.env).");
    error.code = "AI_KEY_REQUIRED";
    throw error;
  }

  if (config.provider === "gemini") {
    // Google Gemini API
    const model = config.model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nПользовательский запрос:\n${userPrompt}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ошибка Google Gemini API (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error("Пустой ответ от Gemini API");
    return candidate.trim();
  } else {
    // OpenAI or OpenAI-compatible (Ollama, LM Studio, Groq, DeepSeek)
    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const endpoint = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ошибка AI API (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от AI модели");
    return content.trim();
  }
}

export async function generateSnippetMeta(files: { filename: string; language: string; content: string }[]) {
  const codePreview = files
    .map(
      (f) =>
        `### Файл: ${f.filename || "snippet"} (${f.language})\n\`\`\`${f.language}\n${f.content.slice(0, 3000)}\n\`\`\``
    )
    .join("\n\n");

  const systemPrompt = `Ты профессиональный ассистент разработчика. Твоя задача — проанализировать предоставленный исходный код и вернуть JSON с метаданными сниппета на русском языке (или на английском, если это общепринятые термины).
Формат ответа СТРОГО чистый JSON без markdown блоков (\`\`\`json):
{
  "title": "Краткое информативное название сниппета (до 60 символов)",
  "description": "Краткое описание того, что делает этот код и где применяется (1-2 предложения)",
  "tags": ["тег1", "тег2", "тег3", "тег4"]
}`;

  const prompt = `Проанализируй следующий сниппет:\n\n${codePreview}`;
  const response = await executeAIRequest(systemPrompt, prompt);

  try {
    // clean any accidental backticks
    const cleaned = response.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || "Новый сниппет",
      description: parsed.description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return {
      title: "Сниппет " + (files[0]?.filename || "Code"),
      description: "Сгенерировано AI",
      tags: files.map((f) => f.language).filter(Boolean),
    };
  }
}

export async function explainSnippet(code: string, language: string) {
  const systemPrompt = `Ты эксперт по программированию. Объясни доступно, структурированно и лаконично, как работает данный код. 
Используй Markdown. Укажи ключевые шаги, алгоритмическую сложность (если применимо) и потенциальные граничные случаи.`;
  const prompt = `Язык: ${language}\n\nКод:\n\`\`\`${language}\n${code}\n\`\`\``;
  return executeAIRequest(systemPrompt, prompt);
}

export async function refactorSnippet(code: string, language: string) {
  const systemPrompt = `Ты ведущий инженер-программист. Твоя задача — оптимизировать, улучшить читаемость, безопасность и качество предоставленного кода.
Сначала покажи улучшенный вариант кода в блоке \`\`\`${language}, а затем перечисли 2-4 ключевых улучшения.`;
  const prompt = `Язык: ${language}\n\nИсходный код:\n\`\`\`${language}\n${code}\n\`\`\``;
  return executeAIRequest(systemPrompt, prompt);
}

export async function documentSnippet(code: string, language: string) {
  const systemPrompt = `Ты эксперт по разработке. Добавь в код исчерпывающие комментарии (JSDoc, Docstring или стандартные комментарии языка), тайпинги и пояснения к ключевым участкам.
Верни готовый код в блоке \`\`\`${language}.`;
  const prompt = `Язык: ${language}\n\nКод:\n\`\`\`${language}\n${code}\n\`\`\``;
  return executeAIRequest(systemPrompt, prompt);
}
