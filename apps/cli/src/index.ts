#!/usr/bin/env node
import { Command } from "commander";
import { logger, loadConfig, expandHome } from "@destiny-os/shared";
import { runCommand } from "./commands/run.js";
import { logsCommand } from "./commands/logs.js";
import { tasksCommand } from "./commands/tasks.js";
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { webCommand } from "./commands/web.js";

const program = new Command();

program
  .name("ago")
  .description("Destiny — Your AI-powered operating system")
  .version("0.0.0");

program
  .command("init")
  .description("Initialize Destiny OS")
  .action(initCommand);

program
  .command("run")
  .description("Run a task")
  .argument("<goal>", "The goal or task description")
  .option("-p, --priority <level>", "Task priority (low, medium, high, critical)", "medium")
  .option("--json", "Output as JSON")
  .action(runCommand);

program
  .command("logs")
  .description("View execution logs")
  .option("-t, --type <type>", "Filter by event type")
  .option("-n, --limit <number>", "Number of logs to show", "50")
  .option("--json", "Output as JSON")
  .action(logsCommand);

program
  .command("tasks")
  .description("List tasks")
  .option("--status <status>", "Filter by status")
  .option("--json", "Output as JSON")
  .action(tasksCommand);

program
  .command("config")
  .description("View or set configuration")
  .argument("[key]", "Config key to get or set")
  .argument("[value]", "Config value to set")
  .action(configCommand);

program
  .command("status")
  .aliases(["st"])
  .description("Show system status")
  .option("--json", "Output as JSON")
  .action(statusCommand);

program
  .command("web")
  .description("Launch web dashboard")
  .option("-p, --port <number>", "Port to listen on", "3456")
  .action(async (options: { port: string }) => {
    await webCommand(parseInt(options.port, 10));
  });

const args = process.argv.slice(2);

async function main() {
  if (args.length === 0) {
    const { launchTui } = await import("./tui/index.js");
    await launchTui();
  } else {
    program.parse(process.argv);
    const config = loadConfig();
    logger.info("Destiny OS initialized");
  }
}

main();
