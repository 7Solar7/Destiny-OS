import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { expandHome } from "@destiny-os/shared";

const CONFIG_PATH = resolve(expandHome("~/DestinyOS"), "config.json");

export async function configCommand(key?: string, value?: string): Promise<void> {
  try {
    if (!existsSync(CONFIG_PATH)) {
      console.log("No config found. Run 'ago init' first.");
      return;
    }

    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);

    if (!key) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (!value) {
      const parts = key.split(".");
      let current: Record<string, unknown> = config;
      for (const part of parts) {
        if (current[part] === undefined) {
          console.log(`Key "${key}" not found`);
          return;
        }
        current = current[part] as Record<string, unknown>;
      }
      console.log(JSON.stringify(current, null, 2));
      return;
    }

    const parts = key.split(".");
    let current: Record<string, unknown> = config;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      if (!current[p] || typeof current[p] !== "object") {
        current[p] = {};
      }
      current = current[p] as Record<string, unknown>;
    }
    const lastKey = parts[parts.length - 1]!;

    const parsedValue = tryParse(value);
    current[lastKey] = parsedValue;

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`Set ${key} = ${JSON.stringify(parsedValue)}`);
  } catch (error) {
    console.error("Config error:", (error as Error).message);
    process.exit(1);
  }
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
