import { EventEmitter } from "node:events";
import { logger, type Event } from "@destiny-os/shared";
import { persistEvent, getEventsByTaskId, getEventsInRange } from "./persistence.js";

export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emitEvent(event: Event): void {
    persistEvent(event);
    this.emit(event.type, event);
    this.emit("*", event);
    logger.debug("EventBus emitted:", event.type);
  }

  subscribe(type: string, handler: (event: Event) => void): () => void {
    this.on(type, handler);
    return () => {
      this.off(type, handler);
    };
  }

  subscribeAll(handler: (event: Event) => void): () => void {
    this.on("*", handler);
    return () => {
      this.off("*", handler);
    };
  }

  replay(taskId?: string, limit = 100): Event[] {
    if (taskId) {
      return getEventsByTaskId(taskId);
    }
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return getEventsInRange(weekAgo.toISOString(), now.toISOString(), limit);
  }

  static reset(): void {
    EventBus.instance = null;
  }
}
