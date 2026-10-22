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
  return executeAIRequestWithConfig(config, systemPrompt, userPrompt);
}

export async function executeAIRequestWithConfig(
  rawConfig: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = { ...rawConfig };

  // Auto-correct provider if user entered Gemini key or model while provider is set to openai
  if (
    config.provider === "openai" &&
    (config.model?.toLowerCase().includes("gemini") || config.apiKey?.startsWith("AIzaSy"))
  ) {
    config.provider = "gemini";
    if (config.baseUrl.includes("api.openai.com")) {
      config.baseUrl = "https://generativelanguage.googleapis.com";
    }
  }

  if (!config.apiKey && config.provider !== "custom") {
    const error: any = new Error(
      "AI API ключ не настроен. Пожалуйста, укажите ваш API ключ в настройках приложения или через переменные окружения (.env)."
    );
    error.code = "AI_KEY_REQUIRED";
    throw error;
  }

  if (config.provider === "gemini") {
    // Google Gemini API
    const model = (config.model || "gemini-3.5-flash").trim();

    const host =
      config.baseUrl && !config.baseUrl.includes("api.openai.com")
        ? config.baseUrl.replace(/\/$/, "")
        : "https://generativelanguage.googleapis.com";

    const url = `${host}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    let res: Response;
    try {
      const fetchOpts: any = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nПользовательский запрос:\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      };

      res = await fetch(url, fetchOpts);
    } catch (fetchErr: any) {
      const cause = fetchErr?.cause;
      const causeMsg = cause?.code || cause?.message || "";
      const isConnectionError =
        cause?.code === "ETIMEDOUT" ||
        cause?.code === "ECONNRESET" ||
        cause?.code === "ECONNREFUSED" ||
        cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        cause?.code === "ENOTFOUND";

      let hint = "";
      if (isConnectionError) {
        hint =
          " (Сервер не смог установить соединение с серверами Google Gemini. В РФ сервис заблокирован; настройте VPN или прокси на сервере/хосте).";
      }

      throw new Error(
        `Сетевая ошибка при обращении к Google Gemini (${host}): ${causeMsg || fetchErr.message}${hint}`
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const json = JSON.parse(errText);
        parsedMsg = json.error?.message || errText;
      } catch {}

      throw new Error(`Ошибка Google Gemini API (${res.status}): ${parsedMsg}`);
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

    let res: Response;
    try {
      const fetchOpts: any = {
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
      };

      res = await fetch(endpoint, fetchOpts);
    } catch (fetchErr: any) {
      const cause = fetchErr?.cause;
      const causeMsg = cause?.code || cause?.message || "";
      const isConnectionError =
        cause?.code === "ETIMEDOUT" ||
        cause?.code === "ECONNRESET" ||
        cause?.code === "ECONNREFUSED" ||
        cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        cause?.code === "ENOTFOUND";

      let hint = "";
      if (isConnectionError) {
        hint =
          config.provider === "openai"
            ? " (Сервер не смог установить соединение с серверами OpenAI. В РФ сервис заблокирован; настройте VPN или прокси на сервере/хосте)."
            : " (Сервер не смог подключиться к указанному Base URL. Проверьте адрес и доступность сервиса).";
      }

      throw new Error(
        `Сетевая ошибка при обращении к ${config.provider.toUpperCase()} (${endpoint}): ${
          causeMsg || fetchErr.message
        }${hint}`
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const json = JSON.parse(errText);
        parsedMsg = json.error?.message || errText;
      } catch {}

      throw new Error(`Ошибка AI API (${res.status}): ${parsedMsg}`);
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
