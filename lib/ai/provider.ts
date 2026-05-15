import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";

// ── Types ────────────────────────────────────────────────────
type ContentPart =
  | string
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GenerateOptions {
  /** Prompt text or multimodal parts array */
  prompt: string | ContentPart[];
  /** Enable Gemini search grounding (ignored for OpenAI) */
  searchGrounding?: boolean;
}

interface ProviderResult {
  text: string;
  provider: string;
}

// ── Provider Config ──────────────────────────────────────────

interface ProviderEntry {
  name: string;
  generate: (opts: GenerateOptions) => Promise<string>;
}

function buildProviders(): ProviderEntry[] {
  const providers: ProviderEntry[] = [];

  // Gemini models (cascading quality → quota)
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const geminiModels = [
      "gemini-2.5-flash",      // Best quality, low free quota
      "gemini-2.0-flash",      // Good quality, higher quota
      "gemini-2.0-flash-lite", // Fastest, highest free quota
    ];

    for (const modelName of geminiModels) {
      const model = genAI.getGenerativeModel({ model: modelName });
      providers.push({
        name: `gemini/${modelName}`,
        generate: (opts) => callGemini(model, modelName, opts),
      });
    }
  }

  // OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    providers.push({
      name: "openai/gpt-4o-mini",
      generate: (opts) => callOpenAI(openai, "gpt-4o-mini", opts),
    });
    providers.push({
      name: "openai/gpt-4o",
      generate: (opts) => callOpenAI(openai, "gpt-4o", opts),
    });
  }

  // Groq Fallback (Extremely fast, free Llama 3)
  if (process.env.GROQ_API_KEY) {
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    providers.push({
      name: "groq/llama-3.3-70b-versatile",
      generate: (opts) => callOpenAI(groq, "llama-3.3-70b-versatile", opts),
    });
  }

  // OpenRouter Fallback (Access to free open source models)
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Resume Tailor",
      },
    });
    providers.push({
      name: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      generate: (opts) => callOpenAI(openrouter, "meta-llama/llama-3.3-70b-instruct:free", opts),
    });
  }

  return providers;
}

// ── Gemini Caller ────────────────────────────────────────────

async function callGemini(
  model: GenerativeModel,
  modelName: string,
  opts: GenerateOptions
): Promise<string> {
  const { prompt, searchGrounding } = opts;

  // Build request based on whether we need search grounding
  if (searchGrounding) {
    const textPrompt = typeof prompt === "string" ? prompt :
      (prompt as ContentPart[]).filter(p => typeof p === "string" || "text" in p)
        .map(p => typeof p === "string" ? p : (p as { text: string }).text).join("\n");

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as const, dynamicThreshold: 0.7 },
        },
      }],
    } as Parameters<typeof model.generateContent>[0]);
    return result.response.text();
  }

  // Standard text or multimodal
  if (typeof prompt === "string") {
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  // Multimodal parts
  const parts = (prompt as ContentPart[]).map((p) => {
    if (typeof p === "string") return { text: p };
    return p;
  });
  const result = await model.generateContent(parts);
  return result.response.text();
}

// ── OpenAI Caller ────────────────────────────────────────────

async function callOpenAI(
  openai: OpenAI,
  modelName: string,
  opts: GenerateOptions
): Promise<string> {
  const { prompt } = opts;

  // Build messages
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (typeof prompt === "string") {
    messages.push({ role: "user", content: prompt });
  } else {
    // Convert multimodal parts to OpenAI format
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const p of prompt as ContentPart[]) {
      if (typeof p === "string") {
        parts.push({ type: "text", text: p });
      } else if ("text" in p) {
        parts.push({ type: "text", text: p.text });
      } else if ("inlineData" in p) {
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
          },
        });
      }
    }
    messages.push({ role: "user", content: parts });
  }

  const response = await openai.chat.completions.create({
    model: modelName,
    messages,
    max_tokens: 8192,
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Rate Limit Detection ─────────────────────────────────────

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("resource_exhausted")
    );
  }
  return false;
}

// ── Main Export: generate with fallback ──────────────────────

let cachedProviders: ProviderEntry[] | null = null;

export async function generateWithFallback(
  opts: GenerateOptions
): Promise<ProviderResult> {
  if (!cachedProviders) {
    cachedProviders = buildProviders();
  }

  if (cachedProviders.length === 0) {
    throw new Error(
      "No AI providers configured. Set GEMINI_API_KEY and/or OPENAI_API_KEY in .env.local"
    );
  }

  const errors: string[] = [];

  for (const provider of cachedProviders) {
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      const text = await provider.generate(opts);
      console.log(`[AI] ✓ Success with ${provider.name}`);
      return { text, provider: provider.name };
    } catch (err) {
      if (isRateLimitError(err)) {
        console.warn(`[AI] ⚠ ${provider.name} rate limited, trying next...`);
        errors.push(`${provider.name}: rate limited`);
        continue;
      }
      // Non-rate-limit errors on search grounding should fall through
      // (OpenAI doesn't support it, so we skip gracefully)
      if (opts.searchGrounding) {
        console.warn(`[AI] ⚠ ${provider.name} failed (search grounding), trying next...`);
        errors.push(`${provider.name}: ${err instanceof Error ? err.message : "unknown"}`);
        continue;
      }
      // For other errors, still try next provider
      console.warn(`[AI] ✗ ${provider.name} failed:`, err);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : "unknown"}`);
      continue;
    }
  }

  throw new Error(
    `All AI providers exhausted. Errors:\n${errors.join("\n")}\n\nTip: Add OPENAI_API_KEY to .env.local for an additional fallback.`
  );
}
