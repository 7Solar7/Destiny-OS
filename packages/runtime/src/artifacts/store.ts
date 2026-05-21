import { nanoid } from "nanoid";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Artifact, CreateArtifact, RetentionPolicy } from "@destiny-os/shared";
import { logger, expandHome } from "@destiny-os/shared";

const ARTIFACTS_DIR = resolve(expandHome("~/DestinyOS"), "artifacts");

export class ArtifactStore {
  private artifacts = new Map<string, Artifact>();
  private baseDir: string;

  constructor(baseDir = ARTIFACTS_DIR) {
    this.baseDir = baseDir;
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  store(input: CreateArtifact, data: Buffer | string): Artifact {
    const id = nanoid();
    const taskDir = resolve(this.baseDir, input.taskId);
    if (!existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true });
    }

    const filename = `${id}-${input.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = resolve(taskDir, filename);

    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    writeFileSync(storagePath, buffer);

    const checksum = createHash("sha256").update(buffer).digest("hex");

    const artifact: Artifact = {
      id,
      taskId: input.taskId,
      runId: input.runId,
      stepId: input.stepId,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: buffer.length,
      storagePath,
      metadata: input.metadata,
      checksum,
      retention: input.retention ?? "task",
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };

    this.artifacts.set(id, artifact);
    logger.info(`Artifact stored: ${artifact.name} (${artifact.sizeBytes} bytes)`);
    return artifact;
  }

  retrieve(id: string): { artifact: Artifact; data: Buffer } | undefined {
    const artifact = this.artifacts.get(id);
    if (!artifact) return undefined;
    if (!existsSync(artifact.storagePath)) {
      this.artifacts.delete(id);
      return undefined;
    }
    const data = readFileSync(artifact.storagePath);
    return { artifact, data };
  }

  delete(id: string): boolean {
    const artifact = this.artifacts.get(id);
    if (!artifact) return false;
    try {
      if (existsSync(artifact.storagePath)) {
        unlinkSync(artifact.storagePath);
      }
      this.artifacts.delete(id);
      logger.info(`Artifact deleted: ${artifact.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete artifact ${id}:`, error);
      return false;
    }
  }

  listByTask(taskId: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.taskId === taskId);
  }

  listByRun(runId: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.runId === runId);
  }

  listByRetention(policy: RetentionPolicy): Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.retention === policy);
  }

  cleanupExpired(): number {
    const now = new Date();
    let count = 0;
    for (const [id, artifact] of this.artifacts) {
      if (artifact.expiresAt && new Date(artifact.expiresAt) <= now) {
        this.delete(id);
        count++;
      }
    }
    if (count > 0) logger.info(`Cleaned up ${count} expired artifacts`);
    return count;
  }

  getTotalSize(): number {
    return Array.from(this.artifacts.values()).reduce((acc, a) => acc + a.sizeBytes, 0);
  }
}
