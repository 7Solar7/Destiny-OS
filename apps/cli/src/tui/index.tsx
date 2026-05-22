import React from "react";
import { render } from "ink";
import { RuntimeStore, initDatabase } from "@destiny-os/runtime";
import { App } from "./app.js";

export async function launchTui(): Promise<void> {
  await initDatabase();
  const store = new RuntimeStore();
  store.init();
  const { waitUntilExit } = render(<App store={store} />);
  await waitUntilExit();
  store.destroy();
}
