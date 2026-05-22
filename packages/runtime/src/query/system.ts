import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expandHome } from "@destiny-os/shared";
import { dbPath } from "../events/persistence.js";

export interface SystemStatus {
  vault: boolean;
  db: boolean;
  dbPath: string | null;
  uptime: number;
}

let startTime = Date.now();

export function getSystemStatus(): SystemStatus {
  const vaultPath = resolve(expandHome("~/DestinyOS"), "vault");
  return {
    vault: existsSync(vaultPath),
    db: dbPath ? existsSync(dbPath) : false,
    dbPath: dbPath,
    uptime: Date.now() - startTime,
  };
}

export function resetUptime(): void {
  startTime = Date.now();
}
