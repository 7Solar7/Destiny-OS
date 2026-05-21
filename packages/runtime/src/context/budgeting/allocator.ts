import type { TokenBudget, ContextSegment } from "@destiny-os/shared";

export interface BudgetConfig {
  total: number;
  systemRatio: number;
  taskRatio: number;
  recentRatio: number;
  compressedRatio: number;
  memoryRatio: number;
  reserveRatio: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  total: 128_000,
  systemRatio: 0.2,
  taskRatio: 0.1,
  recentRatio: 0.3,
  compressedRatio: 0.2,
  memoryRatio: 0.15,
  reserveRatio: 0.05,
};

export function createBudget(config: Partial<BudgetConfig> = {}): TokenBudget {
  const merged = { ...DEFAULT_BUDGET_CONFIG, ...config };
  return {
    total: merged.total,
    system: Math.floor(merged.total * merged.systemRatio),
    task: Math.floor(merged.total * merged.taskRatio),
    recent: Math.floor(merged.total * merged.recentRatio),
    compressed: Math.floor(merged.total * merged.compressedRatio),
    memory: Math.floor(merged.total * merged.memoryRatio),
    reserve: Math.floor(merged.total * merged.reserveRatio),
    used: 0,
  };
}

export function allocateSegments(budget: TokenBudget, segments: ContextSegment[]): ContextSegment[] {
  const allocation: Record<string, number> = {
    system: budget.system,
    task: budget.task,
    recent: budget.recent,
    compressed: budget.compressed,
    memory: budget.memory,
    reserve: budget.reserve,
  };

  const allocated: ContextSegment[] = [];
  let totalUsed = 0;

  for (const segment of segments) {
    const allowance = allocation[segment.type];
    if (allowance === undefined) continue;

    if (segment.tokens <= allowance) {
      allocated.push(segment);
      totalUsed += segment.tokens;
    } else if (allowance > 0) {
      allocated.push({
        ...segment,
        tokens: allowance,
        content: segment.content.slice(0, allowance * 4),
      });
      totalUsed += allowance;
    }
  }

  budget.used = totalUsed;
  return allocated;
}

export function estimateOverflow(segments: ContextSegment[], budget: TokenBudget): number {
  const totalNeeded = segments.reduce((acc, s) => acc + s.tokens, 0);
  return Math.max(0, totalNeeded - (budget.total - budget.reserve));
}

export function shouldCompress(segments: ContextSegment[], budget: TokenBudget, threshold = 0.9): boolean {
  const totalNeeded = segments.reduce((acc, s) => acc + s.tokens, 0);
  const available = budget.total - budget.reserve;
  return totalNeeded > available * threshold;
}
