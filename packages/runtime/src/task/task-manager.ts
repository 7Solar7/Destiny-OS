import { nanoid } from "nanoid";
import type { Task, CreateTask, Run, Step, ToolInvocation, TaskStatus } from "@destiny-os/shared";
import { logger } from "@destiny-os/shared";

interface TaskStore {
  tasks: Map<string, Task>;
}

const store: TaskStore = { tasks: new Map() };

export function createTask(input: CreateTask): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: nanoid(),
    title: input.title,
    description: input.description,
    goal: input.goal,
    status: "pending",
    priority: input.priority ?? "medium",
    runs: [],
    currentRunId: undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
    tags: input.tags,
    projectId: input.projectId,
  };
  store.tasks.set(task.id, task);
  logger.info(`Task created: ${task.id} — "${task.title}"`);
  return task;
}

export function getTask(taskId: string): Task | undefined {
  return store.tasks.get(taskId);
}

export function getAllTasks(): Task[] {
  return Array.from(store.tasks.values());
}

export function updateTaskStatus(taskId: string, status: TaskStatus): Task | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (status === "completed" || status === "failed" || status === "cancelled") {
    task.completedAt = task.updatedAt;
  }
  return task;
}

export function createRun(taskId: string): Run | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run: Run = {
    id: nanoid(),
    taskId,
    status: "running",
    steps: [],
    startedAt: new Date().toISOString(),
  };
  task.runs.push(run);
  task.currentRunId = run.id;
  task.status = "running";
  task.updatedAt = new Date().toISOString();
  logger.info(`Run created: ${run.id} for task ${taskId}`);
  return run;
}

export function completeRun(taskId: string, runId: string, error?: string): Run | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run = task.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  run.status = error ? "failed" : "completed";
  run.completedAt = new Date().toISOString();
  run.duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
  run.error = error;
  if (error) {
    task.status = "failed";
  } else {
    task.status = "completed";
  }
  task.updatedAt = new Date().toISOString();
  task.completedAt = new Date().toISOString();
  return run;
}

export function addStep(
  taskId: string,
  runId: string,
  type: Step["type"],
  input?: unknown
): Step | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run = task.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  const step: Step = {
    id: nanoid(),
    taskId,
    runId,
    type,
    status: "running",
    input,
    toolInvocations: [],
    startedAt: new Date().toISOString(),
  };
  run.steps.push(step);
  return step;
}

export function completeStep(
  taskId: string,
  runId: string,
  stepId: string,
  output?: unknown,
  error?: string
): Step | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run = task.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  const step = run.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  step.status = error ? "failed" : "completed";
  step.output = output;
  step.completedAt = new Date().toISOString();
  step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
  step.error = error;
  return step;
}

export function addToolInvocation(
  taskId: string,
  runId: string,
  stepId: string,
  tool: string,
  input: Record<string, unknown>
): ToolInvocation | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run = task.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  const step = run.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  const invocation: ToolInvocation = {
    id: nanoid(),
    stepId,
    tool,
    input,
    startedAt: new Date().toISOString(),
  };
  step.toolInvocations.push(invocation);
  return invocation;
}

export function completeToolInvocation(
  taskId: string,
  runId: string,
  stepId: string,
  invocationId: string,
  output?: unknown,
  error?: string
): ToolInvocation | undefined {
  const task = store.tasks.get(taskId);
  if (!task) return undefined;
  const run = task.runs.find((r) => r.id === runId);
  if (!run) return undefined;
  const step = run.steps.find((s) => s.id === stepId);
  if (!step) return undefined;
  const invocation = step.toolInvocations.find((i) => i.id === invocationId);
  if (!invocation) return undefined;
  invocation.output = output;
  invocation.completedAt = new Date().toISOString();
  invocation.duration =
    new Date(invocation.completedAt).getTime() - new Date(invocation.startedAt).getTime();
  invocation.error = error;
  return invocation;
}
