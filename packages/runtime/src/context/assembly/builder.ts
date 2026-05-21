import type { ContextSegment, MemoryEntry, Step, Task } from "@destiny-os/shared";
import { retrieveRecency, retrieveImportance } from "../retrieval/retrieval-strategies.js";
import { compressRollingWindow } from "../compression/compressor.js";
import { createBudget, allocateSegments, shouldCompress } from "../budgeting/allocator.js";

export interface ContextAssemblyInput {
  task: Task;
  steps: Step[];
  memoryEntries: MemoryEntry[];
  systemPrompt: string;
  maxTokens?: number;
}

export function assembleContext(input: ContextAssemblyInput): ContextSegment[] {
  const budget = createBudget({ total: input.maxTokens ?? 128_000 });

  const segments: ContextSegment[] = [];

  segments.push({
    source: "system",
    content: input.systemPrompt,
    tokens: estimateSegmentTokens(input.systemPrompt),
    timestamp: new Date().toISOString(),
    type: "system",
  });

  segments.push({
    source: "task",
    content: `Task: ${input.task.title}\nGoal: ${input.task.goal}\nStatus: ${input.task.status}`,
    tokens: estimateSegmentTokens(
      `Task: ${input.task.title}\nGoal: ${input.task.goal}\nStatus: ${input.task.status}`
    ),
    timestamp: input.task.updatedAt,
    type: "task",
  });

  const recentResult = retrieveRecency(input.memoryEntries, 10);
  if (recentResult.entries.length > 0) {
    segments.push({
      source: "memory/recency",
      content: recentResult.entries.map((e) => `[${e.type}] ${e.content}`).join("\n"),
      tokens: estimateSegmentTokens(
        recentResult.entries.map((e) => `[${e.type}] ${e.content}`).join("\n")
      ),
      timestamp: new Date().toISOString(),
      type: "memory",
    });
  }

  const importanceResult = retrieveImportance(input.memoryEntries, 5);
  if (importanceResult.entries.length > 0) {
    segments.push({
      source: "memory/importance",
      content: importanceResult.entries.map((e) => `[${e.type}] ${e.content}`).join("\n"),
      tokens: estimateSegmentTokens(
        importanceResult.entries.map((e) => `[${e.type}] ${e.content}`).join("\n")
      ),
      timestamp: new Date().toISOString(),
      type: "memory",
    });
  }

  const rawSteps = input.steps.slice(-20);
  const recentContent = rawSteps
    .map(
      (s) =>
        `[${s.type}] ${s.error ? `ERROR: ${s.error}` : `OK`} (${s.toolInvocations.length} tools)`
    )
    .join("\n");
  segments.push({
    source: "recent",
    content: recentContent,
    tokens: estimateSegmentTokens(recentContent),
    timestamp: new Date().toISOString(),
    type: "recent",
  });

  if (input.steps.length > 20 && shouldCompress(segments, budget)) {
    const compressed = compressRollingWindow(input.steps, 20);
    const compressedContent = compressed.entries.map((e) => `[${e.type}] ${e.content}`).join("\n");
    segments.push({
      source: "compression",
      content: compressedContent,
      tokens: estimateSegmentTokens(compressedContent),
      timestamp: new Date().toISOString(),
      type: "compressed",
    });
  }

  segments.push({
    source: "reserve",
    content: "",
    tokens: budget.reserve,
    timestamp: new Date().toISOString(),
    type: "reserve",
  });

  return allocateSegments(budget, segments);
}

function estimateSegmentTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
