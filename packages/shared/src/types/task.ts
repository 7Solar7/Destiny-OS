import { z } from "zod";

export const TaskStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const ToolInvocationSchema = z.object({
  id: z.string(),
  stepId: z.string(),
  tool: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.unknown().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  tokens: z.number().optional(),
  error: z.string().optional(),
});
export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;

export const StepSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  runId: z.string(),
  type: z.enum(["plan", "execute", "observe", "reflect", "retry", "finalize"]),
  status: TaskStatus,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  toolInvocations: z.array(ToolInvocationSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
  reflection: z.string().optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const RunSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: TaskStatus,
  steps: z.array(StepSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  goal: z.string(),
  status: TaskStatus,
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  runs: z.array(RunSchema),
  currentRunId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  status: true,
  runs: true,
  currentRunId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;
