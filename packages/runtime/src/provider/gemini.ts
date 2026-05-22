import type { ProviderAdapter } from "./adapter.js";
import type { CompletionRequest, CompletionResponse, ProviderConfig, ProviderType } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider implements ProviderAdapter {
  readonly type: ProviderType = "gemini";
  readonly config: ProviderConfig;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.model = config.model ?? "gemini-2.0-flash";
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error("Gemini API key not configured. Set it via `ago config runtime.apiKey <key>`");
    }

    const systemInstruction = request.messages.find((m) => m.role === "system")?.content;
    const contents: GeminiContent[] = [];

    for (const msg of request.messages) {
      if (msg.role === "system") continue;
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `${GEMINI_BASE}/models/${this.model}:generateContent?key=${apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Gemini network error: ${(err as Error).message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as GeminiResponse;

    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.map((p) => p.text).join("") ?? undefined;

    let finishReason: CompletionResponse["finishReason"] = "stop";
    if (candidate) {
      const fr = candidate.finishReason;
      if (fr === "MAX_TOKENS") finishReason = "length";
      else if (fr === "SAFETY" || fr === "RECITATION" || fr === "OTHER") finishReason = "error";
    }

    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : {
          promptTokens: this.estimateTokens(JSON.stringify(request.messages)),
          completionTokens: this.estimateTokens(content ?? ""),
          totalTokens: 0,
        };

    return { content, finishReason, usage };
  }

  async countTokens(text: string): Promise<number> {
    return this.estimateTokens(text);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
