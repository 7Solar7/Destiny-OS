import { nanoid } from "nanoid";
import type { Task, CreateTask, Run, Step, ToolInvocation, TaskStatus } from "@destiny-os/shared";
import { logger, EventType } from "@destiny-os/shared";
import { persistTask, persistRun, persistStep, loadAllTasks } from "../events/task-persistence.js";
import { EventBus } from "../events/bus.js";

interface TaskStore {
  tasks: Map<string, Task>;
}

const store: TaskStore = { tasks: new Map() };

export function hydrateFromDb(): void {
  const tasks = loadAllTasks();
  for (const task of tasks) {
    store.tasks.set(task.id, task);
  }
  if (tasks.length > 0) {
    logger.info(`Hydrated ${tasks.length} tasks from database`);
  }
}

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
  persistTask(task);
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: EventType.TASK_CREATED,
    taskId: task.id,
    timestamp: now,
    payload: { task: task as unknown as Record<string, unknown> },
  });
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
  persistTask(task);

  const now2 = new Date().toISOString();
  const statusEventType =
    status === "running"
      ? EventType.TASK_STARTED
      : status === "completed"
        ? EventType.TASK_COMPLETED
        : status === "failed"
          ? EventType.TASK_FAILED
          : EventType.TASK_CANCELLED;

  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: statusEventType,
    taskId: task.id,
    timestamp: now2,
    payload: { taskId: task.id, status },
  });

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
  persistRun(run);
  persistTask(task);
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: EventType.RUN_STARTED,
    taskId,
    runId: run.id,
    timestamp: run.startedAt,
    payload: { taskId, runId: run.id },
  });
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
  persistRun(run);
  persistTask(task);
  const runEventType = error ? EventType.RUN_FAILED : EventType.RUN_COMPLETED;
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: runEventType,
    taskId,
    runId: run.id,
    timestamp: run.completedAt ?? new Date().toISOString(),
    payload: { taskId, runId: run.id, error },
  });
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
  persistStep(step);
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: EventType.STEP_STARTED,
    taskId,
    runId,
    stepId: step.id,
    timestamp: step.startedAt,
    payload: { taskId, runId, stepId: step.id, type: step.type },
  });
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
  persistStep(step);
  const stepEventType = error ? EventType.STEP_FAILED : EventType.STEP_COMPLETED;
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: stepEventType,
    taskId,
    runId,
    stepId: step.id,
    timestamp: step.completedAt ?? new Date().toISOString(),
    payload: { taskId, runId, stepId: step.id, error },
  });
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
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: EventType.TOOL_INVOKED,
    taskId,
    runId,
    stepId,
    timestamp: invocation.startedAt,
    payload: { invocationId: invocation.id, tool, input },
  });
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
  const toolEventType = error ? EventType.TOOL_FAILED : EventType.TOOL_COMPLETED;
  EventBus.getInstance().emitEvent({
    id: nanoid(),
    type: toolEventType,
    taskId,
    runId,
    stepId,
    timestamp: invocation.completedAt,
    payload: { invocationId: invocation.id, error },
  });
  return invocation;
}
