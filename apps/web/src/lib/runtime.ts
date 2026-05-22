import { RuntimeStore, initDatabase, EventBus } from "@destiny-os/runtime";
import { broadcastEvent } from "./sse";
import type { Event } from "@destiny-os/shared";

let store: RuntimeStore | null = null;
let initializing: Promise<void> | null = null;
let busWired = false;

export async function getRuntime(): Promise<RuntimeStore> {
  if (store) return store;
  if (!initializing) {
    initializing = initDatabase().then(() => {
      store = new RuntimeStore();
      store.init();
      wireEventBus();
    });
  }
  await initializing;
  return store!;
}

export function getEventBus(): EventBus {
  return EventBus.getInstance();
}

function wireEventBus(): void {
  if (busWired) return;
  busWired = true;
  const bus = getEventBus();
  bus.subscribeAll((event: Event) => {
    broadcastEvent(event);
  });
}
