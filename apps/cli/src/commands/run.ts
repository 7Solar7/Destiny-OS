import { randomUUID } from "node:crypto";
import {
  initDatabase,
  persistEvent,
  createTask,
  createRun,
  ProviderRegistry,
  GeminiProvider,
  ClaudeCodeProvider,
  DefaultAgentLoop,
} from "@destiny-os/runtime";
import type { ProviderAdapter, AgentLoopConfig } from "@destiny-os/runtime";
import { logger, loadConfig } from "@destiny-os/shared";
import type { Event } from "@destiny-os/shared";
import { EventType } from "@destiny-os/shared";

interface RunOptions {
  priority: string;
  json?: boolean;
}

const loopConfig: AgentLoopConfig = {
  maxRetries: 2,
  reflectionEnabled: true,
};

function createProvider(config: ReturnType<typeof loadConfig>): ProviderAdapter {
  const providerType = config.runtime.provider;
  const providerConfig = {
    type: providerType,
    apiKey: config.runtime.apiKey,
    maxTokens: config.runtime.maxTokens,
    temperature: config.runtime.temperature,
  };

  switch (providerType) {
    case "gemini":
      return new GeminiProvider(providerConfig);
    case "claude-code":
      return new ClaudeCodeProvider(providerConfig);
    default:
      throw new Error(
        `Provider "${providerType}" not yet supported for execution. Use "gemini" or "claude-code".`
      );
  }
}

export async function runCommand(goal: string, options: RunOptions): Promise<void> {
  try {
    await initDatabase();

    const config = loadConfig();

    const task = createTask({
      title: goal.slice(0, 80),
      goal,
      priority: options.priority as "low" | "medium" | "high" | "critical",
    });

    if (options.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    logger.info(`Starting task: ${task.id}`);
    logger.info(`Goal: ${goal}`);

    const event: Event = {
      id: randomUUID(),
      type: EventType.TASK_CREATED,
      taskId: task.id,
      timestamp: new Date().toISOString(),
      payload: { title: task.title, goal: task.goal, priority: task.priority },
    };
    persistEvent(event);

    const run = createRun(task.id);
    if (!run) throw new Error("Failed to create run");

    logger.info(`Provider: ${config.runtime.provider}`);

    const provider = createProvider(config);
    const ctx = { task, run, provider, config: loopConfig };
    const loop = new DefaultAgentLoop(ctx);
    const completedRun = await loop.execute();

    logger.info(`Task ${task.id} completed (${completedRun.status})`);
    console.log(JSON.stringify({ taskId: task.id, runId: run.id, status: completedRun.status }, null, 2));
  } catch (error) {
    logger.error("Failed to run task:", error);
    console.error("Error:", (error as Error).message);
    process.exit(1);
  }
}
