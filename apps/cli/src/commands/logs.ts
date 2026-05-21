import { initDatabase, getEventsByType, getEventsByTaskId, getEventsInRange } from "@destiny-os/runtime";

interface LogsOptions {
  type?: string;
  limit: string;
  json?: boolean;
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  try {
    await initDatabase();
    const limit = parseInt(options.limit, 10) || 50;

    let events;
    if (options.type) {
      if (options.type.startsWith("task.")) {
        const taskId = options.type.slice(5);
        events = getEventsByTaskId(taskId);
      } else {
        events = getEventsByType(options.type, limit);
      }
    } else {
      const now = new Date();
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      events = getEventsInRange(fiveHoursAgo.toISOString(), now.toISOString(), limit);
    }

    if (options.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }

    if (events.length === 0) {
      console.log("No events found.");
      return;
    }

    for (const event of events) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      console.log(`[${time}] ${event.type}${event.taskId ? ` (task: ${event.taskId})` : ""}`);
      if (event.payload?.title) {
        console.log(`  ${event.payload.title as string}`);
      }
    }
    console.log(`\n${events.length} events shown`);
  } catch (error) {
    console.error("Error fetching logs:", (error as Error).message);
    process.exit(1);
  }
}
