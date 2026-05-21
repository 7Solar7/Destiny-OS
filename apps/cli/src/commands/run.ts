import { randomUUID } from "node:crypto";
import { initDatabase, persistEvent, createTask, createRun } from "@destiny-os/runtime";
import { logger } from "@destiny-os/shared";
import type { Event } from "@destiny-os/shared";
import { EventType } from "@destiny-os/shared";

interface RunOptions {
  priority: string;
  json?: boolean;
}

export async function runCommand(goal: string, options: RunOptions): Promise<void> {
  try {
    await initDatabase();

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

    logger.info(`Task ${task.id} registered. Use 'ago logs -t task.${task.id}' to track.`);
    logger.info("Note: Full execution requires a provider adapter (Claude Code, OpenAI, or local).");
    logger.info("Set DESTINY_PROVIDER env var to configure.");

    console.log(JSON.stringify({ taskId: task.id, runId: run.id, status: task.status }, null, 2));
  } catch (error) {
    logger.error("Failed to run task:", error);
    console.error("Error:", (error as Error).message);
    process.exit(1);
  }
}
