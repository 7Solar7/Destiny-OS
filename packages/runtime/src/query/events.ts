import { getEventsByType, getEventsByTaskId, getEventsInRange } from "../events/persistence.js";
import type { Event } from "@destiny-os/shared";

export function getRecentEvents(hours = 5, limit = 100): Event[] {
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return getEventsInRange(since.toISOString(), now.toISOString(), limit);
}

export function getWeeklyEvents(limit = 1000): Event[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return getEventsInRange(weekAgo.toISOString(), now.toISOString(), limit);
}

export function getEventsByTypeName(type: string, limit = 50): Event[] {
  return getEventsByType(type, limit);
}

export function getEventsForTask(taskId: string): Event[] {
  return getEventsByTaskId(taskId);
}
