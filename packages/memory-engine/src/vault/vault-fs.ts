import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { logger, expandHome } from "@destiny-os/shared";

export interface VaultEntry {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export class VaultFilesystem {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = resolve(expandHome(vaultPath));
    this.ensureVaultExists();
  }

  get path(): string {
    return this.vaultPath;
  }

  private ensureVaultExists(): void {
    if (!existsSync(this.vaultPath)) {
      mkdirSync(this.vaultPath, { recursive: true });
      this.initDefaultStructure();
      logger.info(`Vault initialized at ${this.vaultPath}`);
    }
  }

  private initDefaultStructure(): void {
    const dirs = [
      "00-Staging",
      "00-Staging/inbox.md",
      "00-Staging/clips",
      "10-Knowledge",
      "10-Knowledge/projects",
      "10-Knowledge/references",
      "10-Knowledge/concepts",
      "20-Workspace",
      "20-Workspace/daily",
      "20-Workspace/projects",
      "20-Workspace/active",
    ];
    for (const d of dirs) {
      if (d.endsWith(".md")) {
        const p = resolve(this.vaultPath, d);
        if (!existsSync(p)) {
          writeFileSync(
            p,
            `# ${d.replace(".md", "").split("/").pop()}\n\nCreated: ${new Date().toISOString()}\n`
          );
        }
      } else {
        const p = resolve(this.vaultPath, d);
        if (!existsSync(p)) {
          mkdirSync(p, { recursive: true });
        }
      }
    }
  }

  readNote(relativePath: string): VaultEntry | undefined {
    const fullPath = resolve(this.vaultPath, relativePath);
    if (!existsSync(fullPath)) return undefined;
    const content = readFileSync(fullPath, "utf-8");
    const stats = statSync(fullPath);
    return {
      path: fullPath,
      relativePath,
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  writeNote(relativePath: string, content: string): VaultEntry {
    const fullPath = resolve(this.vaultPath, relativePath);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content, "utf-8");
    const stats = statSync(fullPath);
    logger.debug(`Vault write: ${relativePath}`);
    return {
      path: fullPath,
      relativePath,
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  appendNote(relativePath: string, content: string): VaultEntry {
    const existing = this.readNote(relativePath);
    const newContent = existing ? `${existing.content}\n\n${content}` : content;
    return this.writeNote(relativePath, newContent);
  }

  listDirectory(relativePath: string): VaultEntry[] {
    const fullPath = resolve(this.vaultPath, relativePath);
    if (!existsSync(fullPath)) return [];
    const entries: VaultEntry[] = [];
    for (const entry of readdirSync(fullPath)) {
      const entryPath = resolve(fullPath, entry);
      const stats = statSync(entryPath);
      if (stats.isFile() && entry.endsWith(".md")) {
        const content = readFileSync(entryPath, "utf-8");
        entries.push({
          path: entryPath,
          relativePath: relative(this.vaultPath, entryPath),
          content,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }
    return entries;
  }

  noteExists(relativePath: string): boolean {
    return existsSync(resolve(this.vaultPath, relativePath));
  }

  deleteNote(relativePath: string): boolean {
    const fullPath = resolve(this.vaultPath, relativePath);
    if (!existsSync(fullPath)) return false;
    unlinkSync(fullPath);
    logger.debug(`Vault delete: ${relativePath}`);
    return true;
  }

  searchNotes(query: string): VaultEntry[] {
    const results: VaultEntry[] = [];
    const searchDir = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const fullPath = resolve(dir, entry);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          searchDir(fullPath);
        } else if (stats.isFile() && entry.endsWith(".md")) {
          const content = readFileSync(fullPath, "utf-8");
          if (content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: fullPath,
              relativePath: relative(this.vaultPath, fullPath),
              content,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
            });
          }
        }
      }
    };
    searchDir(this.vaultPath);
    return results;
  }
}
