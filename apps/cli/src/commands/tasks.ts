import { getAllTasks } from "@destiny-os/runtime";

interface TasksOptions {
  status?: string;
  json?: boolean;
}

export async function tasksCommand(options: TasksOptions): Promise<void> {
  try {
    let tasks = getAllTasks();

    if (options.status) {
      tasks = tasks.filter((t) => t.status === options.status);
    }

    if (options.json) {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }

    if (tasks.length === 0) {
      console.log("No tasks found.");
      return;
    }

    for (const task of tasks) {
      const time = new Date(task.createdAt).toLocaleString();
      const status = task.status === "completed" ? "✓" : task.status === "failed" ? "✗" : "●";
      console.log(`${status} [${task.priority}] ${task.title}`);
      console.log(`  ID: ${task.id} | ${time} | ${task.runs.length} run(s)`);
    }
    console.log(`\n${tasks.length} task(s) total`);
  } catch (error) {
    console.error("Error listing tasks:", (error as Error).message);
    process.exit(1);
  }
}
