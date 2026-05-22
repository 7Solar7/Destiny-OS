import { getRecentEvents, getWeeklyEvents } from "./events.js";
import { getTaskStats } from "./tasks.js";

export interface ActivitySummary {
  last5Hours: number;
  weekly: number;
  tasks: { total: number; running: number; completed: number; failed: number };
}

export function getActivitySummary(): ActivitySummary {
  return {
    last5Hours: getRecentEvents(5, 500).length,
    weekly: getWeeklyEvents(1000).length,
    tasks: getTaskStats(),
  };
}
