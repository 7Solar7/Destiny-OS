import { z } from "zod";

export const SandboxConfigSchema = z.object({
  allowedPaths: z.array(z.string()).default([]),
  allowedHosts: z.array(z.string()).default([]),
  allowedCommands: z.array(z.string()).default([]),
  timeout: z.number().default(30000),
  maxMemory: z.number().default(512),
  maxDisk: z.number().default(100),
});
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

export const SandboxResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  duration: z.number(),
  memoryUsed: z.number().optional(),
});
export type SandboxResult = z.infer<typeof SandboxResultSchema>;
