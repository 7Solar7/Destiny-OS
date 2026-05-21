import { z } from "zod";

export const MemoryEntrySchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  runId: z.string().optional(),
  type: z.enum(["step", "milestone", "reflection", "summary", "episodic"]),
  content: z.string(),
  tokens: z.number(),
  source: z.string(),
  timestamp: z.string().datetime(),
  score: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const ContextSegmentSchema = z.object({
  source: z.string(),
  content: z.string(),
  tokens: z.number(),
  timestamp: z.string().datetime(),
  type: z.enum(["system", "task", "recent", "compressed", "memory", "reserve"]),
});
export type ContextSegment = z.infer<typeof ContextSegmentSchema>;

export const TokenBudgetSchema = z.object({
  total: z.number(),
  system: z.number(),
  task: z.number(),
  recent: z.number(),
  compressed: z.number(),
  memory: z.number(),
  reserve: z.number(),
  used: z.number().default(0),
});
export type TokenBudget = z.infer<typeof TokenBudgetSchema>;

export const CompressionStrategy = z.enum([
  "rolling_window",
  "step_summary",
  "milestone_summary",
  "episodic_distillation",
]);
export type CompressionStrategy = z.infer<typeof CompressionStrategy>;

export const RetrievalStrategy = z.enum([
  "semantic",
  "recency",
  "importance",
  "session_local",
  "project_scoped",
  "user_scoped",
]);
export type RetrievalStrategy = z.infer<typeof RetrievalStrategy>;
