import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger, expandHome } from "@destiny-os/shared";

export async function initCommand(): Promise<void> {
  const destinyDir = resolve(expandHome("~/DestinyOS"));
  const dirs = [
    destinyDir,
    resolve(destinyDir, "vault"),
    resolve(destinyDir, "vault/00-Staging"),
    resolve(destinyDir, "vault/00-Staging/clips"),
    resolve(destinyDir, "vault/10-Knowledge"),
    resolve(destinyDir, "vault/10-Knowledge/projects"),
    resolve(destinyDir, "vault/10-Knowledge/references"),
    resolve(destinyDir, "vault/10-Knowledge/concepts"),
    resolve(destinyDir, "vault/20-Workspace"),
    resolve(destinyDir, "vault/20-Workspace/daily"),
    resolve(destinyDir, "vault/20-Workspace/projects"),
    resolve(destinyDir, "vault/20-Workspace/active"),
    resolve(destinyDir, "logs"),
    resolve(destinyDir, "artifacts"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      logger.info(`Created: ${dir}`);
    }
  }

  const inboxPath = resolve(destinyDir, "vault/00-Staging/inbox.md");
  if (!existsSync(inboxPath)) {
    writeFileSync(inboxPath, `# Inbox\n\nCaptured: ${new Date().toISOString()}\n`);
    logger.info(`Created: ${inboxPath}`);
  }

  const configPath = resolve(destinyDir, "config.json");
  if (!existsSync(configPath)) {
    const config = {
      vault: { path: "~/DestinyOS/vault" },
      runtime: { provider: "claude-code", maxTokens: 8192, temperature: 0.7 },
      google: { authMethod: "oauth" },
      logging: { level: "info", dir: "~/DestinyOS/logs" },
      memory: { writeQueueSize: 100 },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info(`Created: ${configPath}`);
  }

  logger.info("Destiny OS initialized successfully");
  console.log("~/.DestinyOS has been created. Run 'ago' to get started.");
}
