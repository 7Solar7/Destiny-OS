import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Task, Event } from "@destiny-os/shared";
import type { RuntimeStore } from "@destiny-os/runtime";

interface TaskDetailProps {
  store: RuntimeStore;
  taskId: string;
  onBack: () => void;
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "yellow";
    case "completed":
      return "green";
    case "failed":
      return "red";
    case "cancelled":
      return "gray";
    default:
      return "white";
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export function TaskDetail({ store, taskId, onBack }: TaskDetailProps) {
  const [task, setTask] = useState<Task | undefined>(() => store.getTask(taskId));

  useEffect(() => {
    const unsub = store.subscribeAll((_event: Event) => {
      setTask(store.getTask(taskId));
    });
    return unsub;
  }, [store, taskId]);

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onBack();
    }
  });

  if (!task) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="red">Task not found: {taskId}</Text>
        <Text dimColor>Press ESC to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold underline>
          {task.title}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>ID: </Text>
        <Text>{task.id}</Text>
        <Text dimColor>Status: </Text>
        <Text color={statusColor(task.status)}>{task.status}</Text>
        <Text dimColor>Priority: </Text>
        <Text>{task.priority}</Text>
        <Text dimColor>Goal: </Text>
        <Text>{task.goal}</Text>
        {task.description ? (
          <>
            <Text dimColor>Description: </Text>
            <Text>{task.description}</Text>
          </>
        ) : null}
        <Text dimColor>Created: </Text>
        <Text>{task.createdAt}</Text>
        {task.completedAt ? (
          <>
            <Text dimColor>Completed: </Text>
            <Text>{task.completedAt}</Text>
          </>
        ) : null}
        {task.tags ? (
          <>
            <Text dimColor>Tags: </Text>
            <Text>{task.tags.join(", ")}</Text>
          </>
        ) : null}
      </Box>

      <Box marginBottom={1}>
        <Text bold underline>
          Runs ({task.runs.length})
        </Text>
      </Box>

      {task.runs.length === 0 ? (
        <Text dimColor>No runs yet.</Text>
      ) : (
        task.runs.map((run) => (
          <Box key={run.id} flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
            <Box flexDirection="row">
              <Text color={statusColor(run.status)}>
                {run.status === "running" ? "●" : run.status === "completed" ? "✓" : "✗"}
              </Text>
              <Text> </Text>
              <Text bold>Run {run.id.slice(0, 8)}</Text>
              <Box flexGrow={1} />
              <Text dimColor>{formatDuration(run.duration)}</Text>
            </Box>
            {run.steps.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>Steps:</Text>
                {run.steps.map((step) => (
                  <Box key={step.id} flexDirection="row" marginLeft={1}>
                    <Text color={statusColor(step.status)}>
                      {step.status === "running" ? "●" : step.status === "completed" ? "✓" : "✗"}
                    </Text>
                    <Text> </Text>
                    <Text>{step.type}</Text>
                    <Box flexGrow={1} />
                    <Text dimColor>{formatDuration(step.duration)}</Text>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        ))
      )}

      <Box marginTop={1}>
        <Text dimColor>Press ESC to go back</Text>
      </Box>
    </Box>
  );
}
