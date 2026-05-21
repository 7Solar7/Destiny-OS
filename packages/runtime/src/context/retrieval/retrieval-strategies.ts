import type { MemoryEntry, RetrievalStrategy } from "@destiny-os/shared";

export interface RetrievalResult {
  entries: MemoryEntry[];
  strategy: RetrievalStrategy;
  score: number;
}

export function retrieveSemantic(_query: string, _entries: MemoryEntry[], _limit = 10): RetrievalResult {
  return { entries: [], strategy: "semantic", score: 0 };
}

export function retrieveRecency(entries: MemoryEntry[], limit = 10): RetrievalResult {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return {
    entries: sorted.slice(0, limit),
    strategy: "recency",
    score: 1,
  };
}

export function retrieveImportance(entries: MemoryEntry[], limit = 10): RetrievalResult {
  const sorted = [...entries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return {
    entries: sorted.slice(0, limit),
    strategy: "importance",
    score: sorted.length > 0 ? (sorted[0]?.score ?? 0) : 0,
  };
}

export function retrieveSessionLocal(entries: MemoryEntry[], sessionId: string): RetrievalResult {
  const filtered = entries.filter((e) => e.metadata?.sessionId === sessionId);
  return {
    entries: filtered,
    strategy: "session_local",
    score: filtered.length > 0 ? 1 : 0,
  };
}

export function retrieveProjectScoped(entries: MemoryEntry[], projectId: string): RetrievalResult {
  const filtered = entries.filter((e) => e.metadata?.projectId === projectId);
  return {
    entries: filtered,
    strategy: "project_scoped",
    score: filtered.length > 0 ? 1 : 0,
  };
}
