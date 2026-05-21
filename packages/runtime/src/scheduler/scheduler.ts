import type { Task, TaskStatus } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

export interface SchedulerConfig {
  maxConcurrent: number;
  defaultPriority: Task["priority"];
}

export interface QueuedTask {
  task: Task;
  queuedAt: string;
}

export class TaskScheduler {
  private queue: QueuedTask[] = [];
  private running = new Map<string, Task>();
  private config: SchedulerConfig;
  private onTaskStart?: (task: Task) => Promise<void>;
  private onTaskComplete?: (task: Task) => Promise<void>;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      maxConcurrent: 5,
      defaultPriority: "medium",
      ...config,
    };
  }

  onStart(handler: (task: Task) => Promise<void>): void {
    this.onTaskStart = handler;
  }

  onComplete(handler: (task: Task) => Promise<void>): void {
    this.onTaskComplete = handler;
  }

  enqueue(task: Task): void {
    this.queue.push({ task, queuedAt: new Date().toISOString() });
    this.sortQueue();
    logger.info(`Task queued: ${task.id} — "${task.title}" (priority: ${task.priority})`);
    this.dispatch();
  }

  cancel(taskId: string): boolean {
    const idx = this.queue.findIndex((q) => q.task.id === taskId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      logger.info(`Task cancelled from queue: ${taskId}`);
      return true;
    }
    const running = this.running.get(taskId);
    if (running) {
      this.running.delete(taskId);
      logger.info(`Task cancelled from running: ${taskId}`);
      return true;
    }
    return false;
  }

  getQueue(): QueuedTask[] {
    return [...this.queue];
  }

  getRunning(): Task[] {
    return Array.from(this.running.values());
  }

  getStatus(): { queued: number; running: number; concurrency: number } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      concurrency: this.config.maxConcurrent,
    };
  }

  private async dispatch(): Promise<void> {
    while (this.running.size < this.config.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;
      this.running.set(next.task.id, next.task);
      this.executeTask(next.task).finally(() => {
        this.running.delete(next.task.id);
        this.dispatch();
      });
    }
  }

  private async executeTask(task: Task): Promise<void> {
    try {
      logger.info(`Executing task: ${task.id} — "${task.title}"`);
      await this.onTaskStart?.(task);
      await this.onTaskComplete?.(task);
    } catch (error) {
      logger.error(`Task execution failed: ${task.id}`, error);
    }
  }

  private sortQueue(): void {
    const priorityOrder: Record<Task["priority"], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    this.queue.sort(
      (a, b) => priorityOrder[a.task.priority] - priorityOrder[b.task.priority]
    );
  }
}
