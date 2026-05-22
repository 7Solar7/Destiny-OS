import { initDatabase } from "@destiny-os/runtime";
import { logger } from "@destiny-os/shared";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export async function webCommand(port: number): Promise<void> {
  await initDatabase();
  logger.info(`Web dashboard starting on http://localhost:${port} (use --port to change)`);

  const { spawn } = await import("node:child_process");
  const distDir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(distDir, "..", "..", "..");
  const child = spawn(
    process.execPath,
    [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "dev", "--port", String(port)],
    {
      cwd: resolve(root, "apps/web"),
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    }
  );

  return new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`next dev exited with code ${code}`));
    });
  });
}
