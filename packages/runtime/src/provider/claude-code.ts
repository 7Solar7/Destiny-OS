import { spawn } from "node:child_process";
import type { ProviderAdapter } from "./adapter.js";
import type { CompletionRequest, CompletionResponse, ProviderConfig, ProviderType } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

export class ClaudeCodeProvider implements ProviderAdapter {
  readonly type: ProviderType = "claude-code";
  readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessage = request.messages.find((m) => m.role === "user");
    const prompt = [systemMessage?.content, userMessage?.content].filter(Boolean).join("\n\n");

    return new Promise((resolve, reject) => {
      const child = spawn("claude", ["--print", prompt], {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120000,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        reject(new Error(`Claude Code execution error: ${err.message}`));
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Claude Code exited with code ${code}: ${stderr}`));
        } else {
          resolve({
            content: stdout,
            finishReason: "stop",
            usage: {
              promptTokens: this.estimateTokens(prompt),
              completionTokens: this.estimateTokens(stdout),
              totalTokens: this.estimateTokens(prompt) + this.estimateTokens(stdout),
            },
          });
        }
      });

      child.stdin.end();
    });
  }

  async countTokens(text: string): Promise<number> {
    return this.estimateTokens(text);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
