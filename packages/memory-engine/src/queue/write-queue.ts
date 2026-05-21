import { logger } from "@destiny-os/shared";

interface QueuedWrite {
  id: string;
  relativePath: string;
  content: string;
  mode: "write" | "append";
  queuedAt: string;
  completedAt?: string;
  error?: string;
}

export class WriteQueue {
  private queue: QueuedWrite[] = [];
  private processing = false;
  private flushHandler: ((relativePath: string, content: string, mode: "write" | "append") => Promise<void>) | null = null;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  onFlush(handler: (relativePath: string, content: string, mode: "write" | "append") => Promise<void>): void {
    this.flushHandler = handler;
  }

  enqueue(relativePath: string, content: string, mode: "write" | "append" = "write"): void {
    if (this.queue.length >= this.maxSize) {
      logger.warn(`Write queue full (${this.maxSize}), dropping oldest entry`);
      this.queue.shift();
    }

    this.queue.push({
      id: crypto.randomUUID(),
      relativePath,
      content,
      mode,
      queuedAt: new Date().toISOString(),
    });

    logger.debug(`Write queued: ${relativePath} (${mode})`);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || !this.flushHandler) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await this.flushHandler(item.relativePath, item.content, item.mode);
        item.completedAt = new Date().toISOString();
      } catch (error) {
        item.error = (error as Error).message;
        logger.error(`Write failed for ${item.relativePath}:`, error);
      }
    }

    this.processing = false;
  }

  async flush(): Promise<void> {
    await this.process();
  }

  get pending(): number {
    return this.queue.length;
  }

  get status(): { pending: number; processing: boolean; maxSize: number } {
    return { pending: this.queue.length, processing: this.processing, maxSize: this.maxSize };
  }
}
