import { AgentLoop, type AgentLoopContext } from "./agent-loop.js";
import { logger } from "@destiny-os/shared";

export class DefaultAgentLoop extends AgentLoop {
  private planResult: unknown;
  private executionResult: unknown;
  private observationResult: unknown;
  private reflectionResult: unknown;

  constructor(ctx: AgentLoopContext) {
    super(ctx);
  }

  async plan(): Promise<void> {
    this.planResult = await this.runStep("plan", async () => {
      logger.info(`[Plan] Decomposing goal: "${this.ctx.task.goal}"`);
      const response = await this.ctx.provider.complete({
        messages: [
          {
            role: "system",
            content: "You are a planning agent. Break down the following goal into actionable steps.",
          },
          {
            role: "user",
            content: `Goal: ${this.ctx.task.goal}\n\nCreate a step-by-step plan to achieve this goal.`,
          },
        ],
      });
      return response.content;
    });
  }

  async executeSteps(): Promise<unknown> {
    this.executionResult = await this.runStep("execute", async () => {
      logger.info("[Execute] Running execution phase");
      const response = await this.ctx.provider.complete({
        messages: [
          {
            role: "system",
            content: "Execute the plan step by step. Use available tools as needed.",
          },
          {
            role: "user",
            content: `Plan: ${String(this.planResult)}\n\nExecute this plan.`,
          },
        ],
      });
      return response.content;
    });
    return this.executionResult;
  }

  async observe(result: unknown): Promise<void> {
    this.observationResult = await this.runStep("observe", async () => {
      logger.info("[Observe] Collecting results");
      return { result, timestamp: new Date().toISOString() };
    });
  }

  async reflect(result: unknown): Promise<void> {
    this.reflectionResult = await this.runStep("reflect", async () => {
      logger.info("[Reflect] Analyzing outcomes");
      const response = await this.ctx.provider.complete({
        messages: [
          {
            role: "system",
            content: "You are a reflection agent. Analyze the execution results and provide insights.",
          },
          {
            role: "user",
            content: `Goal: ${this.ctx.task.goal}\n\nResult: ${JSON.stringify(result)}\n\nWhat worked well? What could be improved? What should be remembered for next time?`,
          },
        ],
      });
      return response.content;
    });
  }

  async retry(error: Error): Promise<void> {
    await this.runStep("retry", async () => {
      logger.warn(`[Retry] Recovering from error: ${error.message}`);
      const response = await this.ctx.provider.complete({
        messages: [
          {
            role: "system",
            content: "The previous attempt failed. Analyze the error and retry with a corrected approach.",
          },
          {
            role: "user",
            content: `Error: ${error.message}\n\nOriginal plan: ${String(this.planResult)}\n\nFix the issue and retry.`,
          },
        ],
      });
      return response.content;
    });
  }

  async finalize(result: unknown): Promise<void> {
    await this.runStep("finalize", async () => {
      logger.info("[Finalize] Collating results");
      const response = await this.ctx.provider.complete({
        messages: [
          {
            role: "system",
            content: "Summarize the completed task execution. Include key outcomes, artifacts produced, and lessons learned.",
          },
          {
            role: "user",
            content: `Task: ${this.ctx.task.title}\nGoal: ${this.ctx.task.goal}\nResult: ${JSON.stringify(result)}\nReflection: ${String(this.reflectionResult)}\n\nProduce a final summary.`,
          },
        ],
      });
      return response.content;
    });
  }
}
