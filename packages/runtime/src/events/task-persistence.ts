import type { Task, Run, Step } from "@destiny-os/shared";
import { getDb } from "./persistence.js";

export function persistTask(task: Task): void {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO tasks (id, title, description, goal, status, priority, current_run_id, created_at, updated_at, completed_at, tags, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    task.id,
    task.title,
    task.description ?? null,
    task.goal,
    task.status,
    task.priority,
    task.currentRunId ?? null,
    task.createdAt,
    task.updatedAt,
    task.completedAt ?? null,
    task.tags ? JSON.stringify(task.tags) : null,
    task.projectId ?? null,
  );
}

export function persistRun(run: Run): void {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO runs (id, task_id, status, started_at, completed_at, duration, error, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    run.id,
    run.taskId,
    run.status,
    run.startedAt,
    run.completedAt ?? null,
    run.duration ?? null,
    run.error ?? null,
    run.metadata ? JSON.stringify(run.metadata) : null,
  );
}

export function persistStep(step: Step): void {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO steps (id, task_id, run_id, type, status, input, output, tool_invocations, started_at, completed_at, duration, error, reflection)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    step.id,
    step.taskId,
    step.runId,
    step.type,
    step.status,
    step.input ? JSON.stringify(step.input) : null,
    step.output ? JSON.stringify(step.output) : null,
    JSON.stringify(step.toolInvocations),
    step.startedAt,
    step.completedAt ?? null,
    step.duration ?? null,
    step.error ?? null,
    step.reflection ?? null,
  );
}

export function loadAllTasks(): Task[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(deserializeTask);
}

export function loadTask(taskId: string): Task | undefined {
  const d = getDb();
  const row = d.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Record<string, unknown> | undefined;
  return row ? deserializeTask(row) : undefined;
}

export function loadRuns(taskId: string): Run[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM runs WHERE task_id = ? ORDER BY started_at").all(taskId) as Record<string, unknown>[];
  return rows.map(deserializeRun);
}

export function loadSteps(runId: string): Step[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM steps WHERE run_id = ? ORDER BY started_at").all(runId) as Record<string, unknown>[];
  return rows.map(deserializeStep);
}

export function deleteTask(taskId: string): void {
  const d = getDb();
  d.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  d.prepare("DELETE FROM runs WHERE task_id = ?").run(taskId);
  d.prepare("DELETE FROM steps WHERE task_id = ?").run(taskId);
}

export function deleteRun(runId: string): void {
  const d = getDb();
  d.prepare("DELETE FROM runs WHERE id = ?").run(runId);
  d.prepare("DELETE FROM steps WHERE run_id = ?").run(runId);
}

function deserializeTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    goal: row.goal as string,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    runs: [],
    currentRunId: (row.current_run_id as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string) || undefined,
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
    projectId: (row.project_id as string) || undefined,
  };
}

function deserializeRun(row: Record<string, unknown>): Run {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    status: row.status as Run["status"],
    steps: [],
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) || undefined,
    duration: (row.duration as number) || undefined,
    error: (row.error as string) || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  };
}

function deserializeStep(row: Record<string, unknown>): Step {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    runId: row.run_id as string,
    type: row.type as Step["type"],
    status: row.status as Step["status"],
    input: row.input ? JSON.parse(row.input as string) : undefined,
    output: row.output ? JSON.parse(row.output as string) : undefined,
    toolInvocations: JSON.parse(row.tool_invocations as string || "[]"),
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) || undefined,
    duration: (row.duration as number) || undefined,
    error: (row.error as string) || undefined,
    reflection: (row.reflection as string) || undefined,
  };
}
