import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { initDatabase, getEventsInRange, getAllTasks } from "@destiny-os/runtime";
import { expandHome } from "@destiny-os/shared";

interface StatusOptions {
  json?: boolean;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  try {
    const destinyDir = resolve(expandHome("~/DestinyOS"));

    const vaultExists = existsSync(resolve(destinyDir, "vault"));
    const configExists = existsSync(resolve(destinyDir, "config.json"));
    const dbFile = resolve(destinyDir, "destiny.db");
    const dbExists = existsSync(dbFile);

    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let recentEvents = 0;
    let weeklyEvents = 0;
    if (dbExists) {
      try {
        await initDatabase(dbFile);
        recentEvents = getEventsInRange(fiveHoursAgo.toISOString(), now.toISOString(), 500).length;
        weeklyEvents = getEventsInRange(weekAgo.toISOString(), now.toISOString(), 5000).length;
      } catch {
        // DB read failed
      }
    }

    const tasks = getAllTasks();
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const failedTasks = tasks.filter((t) => t.status === "failed").length;
    const runningTasks = tasks.filter((t) => t.status === "running").length;

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            initialized: vaultExists && configExists,
            vault: vaultExists,
            database: dbExists,
            activity: { last5Hours: recentEvents, weekly: weeklyEvents, total: tasks.length },
            tasks: { total: tasks.length, completed: completedTasks, failed: failedTasks, running: runningTasks },
          },
          null,
          2
        )
      );
      return;
    }

    console.log("╔══════════════════════════════════════╗");
    console.log("║        Destiny OS — Status           ║");
    console.log("╚══════════════════════════════════════╝");
    console.log("");
    console.log(`Vault:      ${vaultExists ? "✓" : "✗"} ${resolve(destinyDir, "vault")}`);
    console.log(`Config:     ${configExists ? "✓" : "✗"}`);
    console.log(`Database:   ${dbExists ? "✓" : "✗"}`);
    console.log("");
    console.log("Activity:");
    console.log(`  Last 5h:   ${recentEvents} events`);
    console.log(`  Weekly:    ${weeklyEvents} events`);
    console.log(`  Total:     ${tasks.length} tasks`);
    console.log("");
    console.log("Tasks:");
    console.log(`  Running:   ${runningTasks}`);
    console.log(`  Completed: ${completedTasks}`);
    console.log(`  Failed:    ${failedTasks}`);
  } catch (error) {
    console.error("Error getting status:", (error as Error).message);
    process.exit(1);
  }
}
