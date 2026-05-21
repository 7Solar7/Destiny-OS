import type { MemoryEntry, CompressionStrategy, Step } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

export interface CompressionResult {
  entries: MemoryEntry[];
  strategy: CompressionStrategy;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
}

export function compressRollingWindow(
  steps: Step[],
  windowSize = 20
): CompressionResult {
  const originalTokens = estimateTokens(steps);
  const rawSteps = steps.slice(-windowSize);
  const compressedSteps = steps.slice(0, -windowSize);

  const entries: MemoryEntry[] = compressedSteps.map((s) => ({
    id: s.id,
    type: "summary",
    content: `[${s.type}] ${s.error ? `FAILED: ${s.error}` : `Completed in ${s.duration ?? 0}ms`}`,
    tokens: estimateTokenCount(
      `[${s.type}] ${s.error ? `FAILED: ${s.error}` : `Completed in ${s.duration ?? 0}ms`}`
    ),
    source: `step:${s.id}`,
    timestamp: s.startedAt,
    metadata: { originalType: s.type, compressed: true },
  }));

  return {
    entries,
    strategy: "rolling_window",
    originalTokens,
    compressedTokens: rawSteps.length > 0 ? estimateTokens(rawSteps) : 0,
    ratio: rawSteps.length > 0 ? compressedSteps.length / steps.length : 0,
  };
}

export function compressStepSummary(step: Step): MemoryEntry {
  const summary = `Step ${step.type}: ${step.error ? `Error: ${step.error}` : `OK`} (${step.toolInvocations.length} tool calls)`;
  return {
    id: `summary:${step.id}`,
    type: "summary",
    content: summary,
    tokens: estimateTokenCount(summary),
    source: `step:${step.id}`,
    timestamp: step.startedAt,
    metadata: { originalType: step.type, toolCount: step.toolInvocations.length },
  };
}

export function compressMilestoneSummary(steps: Step[], milestone: string): MemoryEntry {
  const totalTokens = steps.reduce((acc, s) => acc + estimateTokenCount(JSON.stringify(s)), 0);
  const summary = `Milestone "${milestone}": ${steps.length} steps, ${steps.filter((s) => s.status === "completed").length} completed, ${steps.filter((s) => s.status === "failed").length} failed. Total tokens: ${totalTokens}`;
  return {
    id: `milestone:${milestone}:${Date.now()}`,
    type: "milestone",
    content: summary,
    tokens: estimateTokenCount(summary),
    source: "compression",
    timestamp: new Date().toISOString(),
    metadata: { milestone, stepCount: steps.length, totalTokens },
  };
}

export function compressToEpisodic(taskId: string, content: string): MemoryEntry {
  const compressed = content.slice(0, 2000);
  return {
    id: `episodic:${taskId}:${Date.now()}`,
    type: "episodic",
    content: compressed,
    tokens: estimateTokenCount(compressed),
    source: `task:${taskId}`,
    timestamp: new Date().toISOString(),
    metadata: { taskId, originalLength: content.length },
  };
}

export function estimateTokens(input: unknown): number {
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => acc + estimateTokenCount(JSON.stringify(item)), 0);
  }
  return estimateTokenCount(JSON.stringify(input));
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
