import { VaultFilesystem, type VaultEntry } from "./vault/vault-fs.js";
import { WriteQueue } from "./queue/write-queue.js";
import { VaultIndexer } from "./indexing/indexer.js";
import { logger, expandHome } from "@destiny-os/shared";

export class MemoryEngine {
  private vault: VaultFilesystem;
  private writeQueue: WriteQueue;
  private indexer: VaultIndexer;

  constructor(vaultPath?: string) {
    const resolvedPath = vaultPath ?? expandHome("~/DestinyOS/vault");
    this.vault = new VaultFilesystem(resolvedPath);
    this.writeQueue = new WriteQueue(100);
    this.indexer = new VaultIndexer();

    this.writeQueue.onFlush(async (relativePath, content, mode) => {
      if (mode === "append") {
        this.vault.appendNote(relativePath, content);
      } else {
        this.vault.writeNote(relativePath, content);
      }
    });

    logger.info("Memory engine initialized");
  }

  get vaultPath(): string {
    return this.vault.path;
  }

  read(relativePath: string): VaultEntry | undefined {
    const entry = this.vault.readNote(relativePath);
    if (entry) {
      this.indexer.indexEntry(entry);
    }
    return entry;
  }

  write(relativePath: string, content: string): void {
    this.writeQueue.enqueue(relativePath, content, "write");
    this.indexer.indexEntry({
      path: relativePath,
      relativePath,
      content,
      size: Buffer.byteLength(content),
      modifiedAt: new Date().toISOString(),
    });
  }

  append(relativePath: string, content: string): void {
    this.writeQueue.enqueue(relativePath, content, "append");
  }

  delete(relativePath: string): boolean {
    const result = this.vault.deleteNote(relativePath);
    if (result) {
      this.indexer.removeFromIndex(relativePath);
    }
    return result;
  }

  list(relativePath: string): VaultEntry[] {
    return this.vault.listDirectory(relativePath);
  }

  search(query: string): VaultEntry[] {
    const results = this.vault.searchNotes(query);
    for (const entry of results) {
      this.indexer.indexEntry(entry);
    }
    return results;
  }

  searchByTag(tag: string) {
    return this.indexer.searchByTag(tag);
  }

  searchByTitle(query: string) {
    return this.indexer.searchByTitle(query);
  }

  getIndexStats() {
    return this.indexer.getStats();
  }

  getQueueStatus() {
    return this.writeQueue.status;
  }

  async flush(): Promise<void> {
    await this.writeQueue.flush();
  }
}
