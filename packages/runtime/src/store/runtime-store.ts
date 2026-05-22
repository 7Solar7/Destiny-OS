import { EventBus } from "../events/bus.js";
import { hydrateFromDb, getAllTasks, getTask } from "../task/task-manager.js";
import { getActivitySummary } from "../query/stats.js";
import { getSystemStatus } from "../query/system.js";
import { getRecentEvents } from "../query/events.js";
import type { Event, Task } from "@destiny-os/shared";

export class RuntimeStore {
  private bus: EventBus;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.bus = EventBus.getInstance();
  }

  init(): void {
    hydrateFromDb();
  }

  getTasks(): Task[] {
    return getAllTasks();
  }

  getTask(taskId: string): Task | undefined {
    return getTask(taskId);
  }

  getSummary() {
    return getActivitySummary();
  }

  getStatus() {
    return getSystemStatus();
  }

  getRecentEvents(hours = 5, limit = 100): Event[] {
    return getRecentEvents(hours, limit);
  }

  subscribeAll(handler: (event: Event) => void): () => void {
    const unsub = this.bus.subscribeAll(handler);
    this.listeners.add(unsub);
    return unsub;
  }

  subscribe(type: string, handler: (event: Event) => void): () => void {
    const unsub = this.bus.subscribe(type, handler);
    this.listeners.add(unsub);
    return unsub;
  }

  destroy(): void {
    for (const unsub of this.listeners) {
      unsub();
    }
    this.listeners.clear();
  }
}
