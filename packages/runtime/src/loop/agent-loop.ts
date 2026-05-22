import { logger, type Task, type Run, type Step, type ProviderConfig, type CompletionResponse } from "@destiny-os/shared";
import {
  completeRun,
  addStep,
  completeStep,
  updateTaskStatus,
} from "../task/task-manager.js";
import type { ProviderAdapter } from "../provider/adapter.js";

export interface AgentLoopConfig {
  maxRetries: number;
  reflectionEnabled: boolean;
}

export interface AgentLoopContext {
  task: Task;
  run: Run;
  provider: ProviderAdapter;
  config: AgentLoopConfig;
}

export abstract class AgentLoop {
  protected ctx: AgentLoopContext;

  constructor(ctx: AgentLoopContext) {
    this.ctx = ctx;
  }

  async execute(): Promise<Run> {
    const { task, run, provider, config } = this.ctx;

    updateTaskStatus(task.id, "running");

    try {
      await this.plan();
      const result = await this.executeSteps();
      await this.observe(result);
      if (config.reflectionEnabled) {
        await this.reflect(result);
      }
      await this.finalize(result);
      completeRun(task.id, run.id);
    } catch (error) {
      const attempts = config.maxRetries;
      for (let i = 0; i < attempts; i++) {
        logger.warn(`Retry attempt ${i + 1}/${attempts} for task ${task.id}`);
        try {
          await this.retry(error as Error);
          completeRun(task.id, run.id);
          break;
        } catch (retryError) {
          if (i === attempts - 1) {
            completeRun(task.id, run.id, (retryError as Error).message);
            throw retryError;
          }
        }
      }
    }

    return run;
  }

  abstract plan(): Promise<void>;
  abstract executeSteps(): Promise<unknown>;
  abstract observe(result: unknown): Promise<void>;
  abstract reflect(result: unknown): Promise<void>;
  abstract retry(error: Error): Promise<void>;
  abstract finalize(result: unknown): Promise<void>;

  protected async runStep(type: Step["type"], fn: () => Promise<unknown>): Promise<unknown> {
    const step = addStep(this.ctx.task.id, this.ctx.run.id, type);
    if (!step) throw new Error("Failed to create step");
    try {
      const result = await fn();
      completeStep(this.ctx.task.id, this.ctx.run.id, step.id, result);
      return result;
    } catch (error) {
      completeStep(this.ctx.task.id, this.ctx.run.id, step.id, undefined, (error as Error).message);
      throw error;
    }
  }
}
