import { z } from "zod";

export const ProviderType = z.enum(["claude-code", "openai", "gemini", "local"]);
export type ProviderType = z.infer<typeof ProviderType>;

export const ProviderConfigSchema = z.object({
  type: ProviderType,
  model: z.string().optional(),
  apiKey: z.string().optional(),
  maxTokens: z.number().default(8192),
  temperature: z.number().min(0).max(2).default(0.7),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const CompletionRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        inputSchema: z.record(z.string(), z.unknown()),
      })
    )
    .optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
});
export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const CompletionResponseSchema = z.object({
  content: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  finishReason: z.enum(["stop", "tool_uses", "length", "error"]),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});
export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;
