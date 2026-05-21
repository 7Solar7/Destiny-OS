import type { ContextSegment, MemoryEntry, Step, Task } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";
import { assembleContext } from "./assembly/builder.js";
import { compressRollingWindow, compressToEpisodic } from "./compression/compressor.js";
import { shouldCompress } from "./budgeting/allocator.js";

export class ContextManager {
  private memoryEntries: MemoryEntry[] = [];

  addMemoryEntry(entry: MemoryEntry): void {
    this.memoryEntries.push(entry);
    logger.debug(`Memory entry added: ${entry.type} (${entry.tokens} tokens)`);
  }

  getMemoryEntries(): MemoryEntry[] {
    return [...this.memoryEntries];
  }

  assemble(task: Task, steps: Step[], systemPrompt: string, maxTokens?: number): ContextSegment[] {
    return assembleContext({
      task,
      steps,
      memoryEntries: this.memoryEntries,
      systemPrompt,
      maxTokens,
    });
  }

  checkAndCompress(steps: Step[]): boolean {
    if (steps.length > 20) {
      const result = compressRollingWindow(steps, 20);
      for (const entry of result.entries) {
        this.addMemoryEntry(entry);
      }
      logger.info(`Compression triggered: ${result.originalTokens} → ${result.compressedTokens} tokens`);
      return true;
    }
    return false;
  }

  distillToEpisodic(taskId: string, content: string): MemoryEntry {
    const entry = compressToEpisodic(taskId, content);
    this.addMemoryEntry(entry);
    return entry;
  }

  getTokenBudgetStatus(): { total: number; used: number; available: number } {
    const total = this.memoryEntries.reduce((acc, e) => acc + e.tokens, 0);
    return { total, used: total, available: 128_000 - total };
  }
}
