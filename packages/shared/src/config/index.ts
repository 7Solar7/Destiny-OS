import { readFileSync } from "node:fs";
import { z } from "zod";

export const VaultConfigSchema = z.object({
  path: z.string().default("~/DestinyOS/vault"),
});

export const RuntimeConfigSchema = z.object({
  provider: z.enum(["claude-code", "openai", "local"]).default("claude-code"),
  maxTokens: z.number().default(8192),
  temperature: z.number().default(0.7),
});

export const GoogleConfigSchema = z.object({
  authMethod: z.enum(["oauth", "service-account"]).default("oauth"),
  credentialsPath: z.string().optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  dir: z.string().default("~/DestinyOS/logs"),
});

export const MemoryConfigSchema = z.object({
  writeQueueSize: z.number().default(100),
  vaultPath: z.string().optional(),
});

export const DestinyConfigSchema = z.object({
  vault: VaultConfigSchema.default({ path: "~/DestinyOS/vault" }),
  runtime: RuntimeConfigSchema.default({
    provider: "claude-code",
    maxTokens: 8192,
    temperature: 0.7,
  }),
  google: GoogleConfigSchema.default({ authMethod: "oauth" }),
  logging: LoggingConfigSchema.default({ level: "info", dir: "~/DestinyOS/logs" }),
  memory: MemoryConfigSchema.default({ writeQueueSize: 100 }),
});
export type DestinyConfig = z.infer<typeof DestinyConfigSchema>;

export const DEFAULT_CONFIG: DestinyConfig = {
  vault: { path: "~/DestinyOS/vault" },
  runtime: { provider: "claude-code", maxTokens: 8192, temperature: 0.7 },
  google: { authMethod: "oauth" },
  logging: { level: "info", dir: "~/DestinyOS/logs" },
  memory: { writeQueueSize: 100 },
};

export function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || ".";
    return path.replace("~", home);
  }
  return path;
}

export function loadConfig(): DestinyConfig {
  const configPath = process.env.DESTINY_CONFIG_PATH;
  if (configPath) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      return DestinyConfigSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}
