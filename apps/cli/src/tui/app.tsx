import React, { useState, useCallback } from "react";
import { Box, useApp, useInput } from "ink";
import { RuntimeStore } from "@destiny-os/runtime";
import { TaskList } from "./task-list.js";
import { TaskDetail } from "./task-detail.js";
import { StatusBar } from "./status-bar.js";

type View =
  | { name: "list" }
  | { name: "detail"; taskId: string };

interface AppProps {
  store: RuntimeStore;
}

export function App({ store }: AppProps) {
  const { exit } = useApp();
  const [view, setView] = useState<View>({ name: "list" });

  const handleSelect = useCallback((taskId: string) => {
    setView({ name: "detail", taskId });
  }, []);

  const handleBack = useCallback(() => {
    setView({ name: "list" });
  }, []);

  useInput((input, key) => {
    if (input === "q" && key.ctrl) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1}>
        {view.name === "list" ? (
          <TaskList store={store} onSelect={handleSelect} />
        ) : (
          <TaskDetail store={store} taskId={view.taskId} onBack={handleBack} />
        )}
      </Box>
      <StatusBar store={store} />
    </Box>
  );
}
