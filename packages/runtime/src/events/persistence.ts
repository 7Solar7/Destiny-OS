import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expandHome, logger } from "@destiny-os/shared";
import type { Event } from "@destiny-os/shared";

let db: SqlJsDatabase | null = null;
let dbPath: string | null = null;

export async function initDatabase(databasePath?: string): Promise<void> {
  const resolvedPath = databasePath ?? resolve(expandHome("~/DestinyOS"), "destiny.db");
  dbPath = resolvedPath;

  const dir = resolve(resolvedPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();
  if (existsSync(resolvedPath)) {
    const buffer = readFileSync(resolvedPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  logger.info("Database initialized at", resolvedPath);
}

function runMigrations(sqlite: SqlJsDatabase): void {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      task_id TEXT,
      run_id TEXT,
      step_id TEXT,
      timestamp TEXT NOT NULL,
      payload TEXT NOT NULL,
      metadata TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      current_run_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      tags TEXT,
      project_id TEXT
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration REAL,
      error TEXT,
      metadata TEXT
    );
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      input TEXT,
      output TEXT,
      tool_invocations TEXT DEFAULT '[]',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration REAL,
      error TEXT,
      reflection TEXT
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      step_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      metadata TEXT,
      checksum TEXT,
      retention TEXT NOT NULL DEFAULT 'task',
      created_at TEXT NOT NULL,
      expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      run_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      source TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      score REAL,
      metadata TEXT
    );
  `);

  sqlite.run(`
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_runs_task_id ON runs(task_id);
    CREATE INDEX IF NOT EXISTS idx_steps_run_id ON steps(run_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_task_id ON artifacts(task_id);
    CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type);
  `);
  saveDatabase();
}

function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
  }
}

function getDb(): SqlJsDatabase {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function persistEvent(event: Event): void {
  const d = getDb();
  d.run(
    "INSERT INTO events (id, type, task_id, run_id, step_id, timestamp, payload, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      event.id,
      event.type,
      event.taskId ?? null,
      event.runId ?? null,
      event.stepId ?? null,
      event.timestamp,
      JSON.stringify(event.payload),
      event.metadata ? JSON.stringify(event.metadata) : null,
    ]
  );
  saveDatabase();
  logger.debug("Event persisted:", event.type);
}

export function getEventsByType(type: string, limit = 100): Event[] {
  const d = getDb();
  const stmt = d.prepare("SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?");
  stmt.bind([type, limit]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows.map(deserializeEvent);
}

export function getEventsByTaskId(taskId: string): Event[] {
  const d = getDb();
  const stmt = d.prepare("SELECT * FROM events WHERE task_id = ? ORDER BY timestamp DESC");
  stmt.bind([taskId]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows.map(deserializeEvent);
}

export function getEventsInRange(from: string, to: string, limit = 500): Event[] {
  const d = getDb();
  const stmt = d.prepare(
    "SELECT * FROM events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?"
  );
  stmt.bind([from, to, limit]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows.map(deserializeEvent);
}

export function replayEvents(handler: (event: Event) => void, filter?: { type?: string; taskId?: string }): void {
  const d = getDb();
  let stmt: ReturnType<SqlJsDatabase["prepare"]>;
  if (filter?.type) {
    stmt = d.prepare("SELECT * FROM events WHERE type = ? ORDER BY timestamp");
    stmt.bind([filter.type]);
  } else if (filter?.taskId) {
    stmt = d.prepare("SELECT * FROM events WHERE task_id = ? ORDER BY timestamp");
    stmt.bind([filter.taskId]);
  } else {
    stmt = d.prepare("SELECT * FROM events ORDER BY timestamp");
  }
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    handler(deserializeEvent(row));
  }
  stmt.free();
}

function deserializeEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    type: row.type as string,
    taskId: (row.task_id as string) || undefined,
    runId: (row.run_id as string) || undefined,
    stepId: (row.step_id as string) || undefined,
    timestamp: row.timestamp as string,
    payload: JSON.parse(row.payload as string),
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  };
}
