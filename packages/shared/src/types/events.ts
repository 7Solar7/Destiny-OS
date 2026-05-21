import { z } from "zod";

export const EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  taskId: z.string().optional(),
  runId: z.string().optional(),
  stepId: z.string().optional(),
  timestamp: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const EventType = {
  TASK_CREATED: "task.created",
  TASK_STARTED: "task.started",
  TASK_COMPLETED: "task.completed",
  TASK_FAILED: "task.failed",
  TASK_CANCELLED: "task.cancelled",
  RUN_STARTED: "run.started",
  RUN_COMPLETED: "run.completed",
  RUN_FAILED: "run.failed",
  STEP_STARTED: "step.started",
  STEP_COMPLETED: "step.completed",
  STEP_FAILED: "step.failed",
  TOOL_INVOKED: "tool.invoked",
  TOOL_COMPLETED: "tool.completed",
  TOOL_FAILED: "tool.failed",
  MEMORY_WRITE: "memory.write",
  MEMORY_READ: "memory.read",
  MEMORY_SEARCH: "memory.search",
  COMPRESSION_TRIGGERED: "compression.triggered",
  ARTIFACT_CREATED: "artifact.created",
  ARTIFACT_DELETED: "artifact.deleted",
  SKILL_STARTED: "skill.started",
  SKILL_COMPLETED: "skill.completed",
  SKILL_FAILED: "skill.failed",
  PERMISSION_DENIED: "permission.denied",
  PROVIDER_SWITCHED: "provider.switched",
  AGENT_REFLECTED: "agent.reflected",
} as const;
