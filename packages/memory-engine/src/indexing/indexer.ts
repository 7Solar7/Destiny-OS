import { logger } from "@destiny-os/shared";
import type { VaultEntry } from "../vault/vault-fs.js";

export interface IndexEntry {
  relativePath: string;
  title: string;
  tags: string[];
  wordCount: number;
  modifiedAt: string;
  linkedNotes: string[];
}

export class VaultIndexer {
  private index = new Map<string, IndexEntry>();
  private dirty = false;

  indexEntry(entry: VaultEntry): IndexEntry {
    const title = this.extractTitle(entry.content);
    const tags = this.extractTags(entry.content);
    const linkedNotes = this.extractLinks(entry.content);

    const indexEntry: IndexEntry = {
      relativePath: entry.relativePath,
      title,
      tags,
      wordCount: entry.content.split(/\s+/).length,
      modifiedAt: entry.modifiedAt,
      linkedNotes,
    };

    this.index.set(entry.relativePath, indexEntry);
    this.dirty = true;
    return indexEntry;
  }

  removeFromIndex(relativePath: string): void {
    this.index.delete(relativePath);
    this.dirty = true;
  }

  getEntry(relativePath: string): IndexEntry | undefined {
    return this.index.get(relativePath);
  }

  searchByTag(tag: string): IndexEntry[] {
    return Array.from(this.index.values()).filter((e) =>
      e.tags.includes(tag.toLowerCase())
    );
  }

  searchByTitle(query: string): IndexEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.index.values()).filter((e) =>
      e.title.toLowerCase().includes(lower)
    );
  }

  getBacklinks(relativePath: string): string[] {
    return Array.from(this.index.values())
      .filter((e) => e.linkedNotes.includes(relativePath))
      .map((e) => e.relativePath);
  }

  getStats(): { totalNotes: number; totalTags: number; totalWords: number } {
    const entries = Array.from(this.index.values());
    const allTags = new Set(entries.flatMap((e) => e.tags));
    return {
      totalNotes: entries.length,
      totalTags: allTags.size,
      totalWords: entries.reduce((acc, e) => acc + e.wordCount, 0),
    };
  }

  isDirty(): boolean {
    return this.dirty;
  }

  markClean(): void {
    this.dirty = false;
  }

  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() ?? "Untitled";
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];
    const regex = /#([a-zA-Z0-9_/-]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) tags.push(match[1].toLowerCase());
    }
    return [...new Set(tags)];
  }

  private extractLinks(content: string): string[] {
    const links: string[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) links.push(match[1].split("|")[0]?.trim() ?? match[1].trim());
    }
    return [...new Set(links)];
  }
}
