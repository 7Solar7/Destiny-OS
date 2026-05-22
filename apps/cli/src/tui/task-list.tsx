import React, { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import type { Task, Event } from "@destiny-os/shared";
import type { RuntimeStore } from "@destiny-os/runtime";

interface TaskListProps {
  store: RuntimeStore;
  onSelect: (taskId: string) => void;
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

function statusIcon(status: string): string {
  switch (status) {
    case "running":
      return "●";
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    case "cancelled":
      return "—";
    default:
      return "○";
  }
}

export function TaskList({ store, onSelect }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(() => store.getTasks());
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const unsub = store.subscribeAll((_event: Event) => {
      setTasks(store.getTasks());
    });
    return unsub;
  }, [store]);

  useInput(
    useCallback(
      (input, key) => {
        if (key.upArrow) {
          setCursor((prev) => (prev > 0 ? prev - 1 : tasks.length - 1));
        } else if (key.downArrow) {
          setCursor((prev) => (prev < tasks.length - 1 ? prev + 1 : 0));
        } else if (key.return) {
          const task = tasks[cursor];
          if (task) onSelect(task.id);
        }
      },
      [tasks, cursor, onSelect]
    )
  );

  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No tasks yet. Use `ago run {'<goal>'}` to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold underline>
          Tasks ({tasks.length})
        </Text>
      </Box>
      {tasks.map((task, idx) => (
        <Box key={task.id} flexDirection="row">
          <Text>{idx === cursor ? "▸ " : "  "}</Text>
          <Text color={statusColor(task.status)}>
            {statusIcon(task.status)}
          </Text>
          <Text> </Text>
          <Text bold={idx === cursor} inverse={idx === cursor}>
            {task.title}
          </Text>
          <Box flexGrow={1} />
          <Text dimColor>{task.priority}</Text>
        </Box>
      ))}
    </Box>
  );
}
