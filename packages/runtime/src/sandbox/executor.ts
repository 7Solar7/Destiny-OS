import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import type { SandboxConfig, SandboxResult } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

export interface ExecutionRequest {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  maxMemory?: number;
}

export class SandboxExecutor {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      allowedPaths: [],
      allowedHosts: [],
      allowedCommands: [],
      timeout: 30000,
      maxMemory: 512,
      maxDisk: 100,
      ...config,
    };
  }

  async execute(request: ExecutionRequest): Promise<SandboxResult> {
    this.validateCommand(request.command);
    this.validateTimeout(request.timeout);
    this.validateCwd(request.cwd);

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const child = spawn(request.command, request.args ?? [], {
        cwd: request.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: request.timeout ?? this.config.timeout,
        shell: true,
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
        reject(new Error(`Execution error: ${err.message}`));
      });

      child.on("close", (exitCode) => {
        const duration = Date.now() - startTime;
        resolve({
          exitCode: exitCode ?? -1,
          stdout,
          stderr,
          duration,
        });
      });
    });
  }

  private validateCommand(command: string): void {
    if (this.config.allowedCommands.length > 0) {
      const baseCommand = command.split(" ")[0];
      if (!baseCommand) throw new Error("Empty command");
      const allowed = this.config.allowedCommands.some((c) => baseCommand?.startsWith(c));
      if (!allowed) {
        throw new Error(`Command "${command}" is not in the allowed list`);
      }
    }
  }

  private validateTimeout(timeout?: number): void {
    if (timeout && timeout > 300000) {
      throw new Error(`Timeout ${timeout}ms exceeds maximum of 300000ms`);
    }
  }

  private validateCwd(cwd?: string): void {
    if (cwd && this.config.allowedPaths.length > 0) {
      const allowed = this.config.allowedPaths.some((p) => cwd.startsWith(p));
      if (!allowed) {
        throw new Error(`Working directory "${cwd}" is not in allowed paths`);
      }
    }
  }

  validatePath(path: string): boolean {
    if (this.config.allowedPaths.length === 0) return true;
    return this.config.allowedPaths.some((p) => path.startsWith(p));
  }

  validateHost(host: string): boolean {
    if (this.config.allowedHosts.length === 0) return true;
    return this.config.allowedHosts.includes(host);
  }
}
