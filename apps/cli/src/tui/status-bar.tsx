import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { RuntimeStore } from "@destiny-os/runtime";
import type { Event } from "@destiny-os/shared";

interface StatusBarProps {
  store: RuntimeStore;
}

export function StatusBar({ store }: StatusBarProps) {
  const [summary, setSummary] = useState(() => store.getSummary());
  const [status, setStatus] = useState(() => store.getStatus());

  useEffect(() => {
    const unsub = store.subscribeAll((_event: Event) => {
      setSummary(store.getSummary());
      setStatus(store.getStatus());
    });
    return unsub;
  }, [store]);

  const uptime = Math.floor(status.uptime / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${hours}h ${minutes}m`;

  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold>Tasks:</Text>
      <Text> {summary.tasks.total} </Text>
      <Text color="yellow">● {summary.tasks.running}</Text>
      <Text> </Text>
      <Text color="green">✓ {summary.tasks.completed}</Text>
      <Text> </Text>
      <Text color="red">✗ {summary.tasks.failed}</Text>
      <Box flexGrow={1} />
      <Text dimColor>
        Events (5h): {summary.last5Hours} | Uptime: {uptimeStr}
      </Text>
    </Box>
  );
}
