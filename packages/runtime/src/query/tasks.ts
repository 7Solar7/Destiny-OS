import { getAllTasks, getTask } from "../task/task-manager.js";
import { loadAllTasks } from "../events/task-persistence.js";
import type { Task } from "@destiny-os/shared";

export function getActiveTasks(): Task[] {
  return getAllTasks().filter((t) => t.status === "running" || t.status === "pending");
}

export function getCompletedTasks(): Task[] {
  return getAllTasks().filter((t) => t.status === "completed");
}

export function getFailedTasks(): Task[] {
  return getAllTasks().filter((t) => t.status === "failed");
}

export function getTaskStats(): { total: number; running: number; completed: number; failed: number } {
  const tasks = getAllTasks();
  return {
    total: tasks.length,
    running: tasks.filter((t) => t.status === "running").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };
}

export function getTaskById(taskId: string): Task | undefined {
  return getTask(taskId);
}

export function getAllTasksFromDb(): Task[] {
  return loadAllTasks();
}
