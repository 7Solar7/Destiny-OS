import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expandHome, logger } from "@destiny-os/shared";
import type { Event } from "@destiny-os/shared";

interface DbRow {
  [key: string]: unknown;
}

class Stmt {
  private stmt: any = null;
  constructor(stmt: any) {
    this.stmt = stmt;
  }
  run(...params: unknown[]): void {
    if (!this.stmt) throw new Error("Statement already freed");
    this.stmt.bind(params);
    this.stmt.step();
    this.stmt.free();
    this.stmt = null;
  }
  all(...params: unknown[]): DbRow[] {
    if (!this.stmt) throw new Error("Statement already freed");
    this.stmt.bind(params);
    const rows: DbRow[] = [];
    while (this.stmt.step()) {
      rows.push(this.stmt.getAsObject() as DbRow);
    }
    this.stmt.free();
    this.stmt = null;
    return rows;
  }
  get(...params: unknown[]): DbRow | undefined {
    if (!this.stmt) throw new Error("Statement already freed");
    this.stmt.bind(params);
    let row: DbRow | undefined;
    if (this.stmt.step()) {
      row = this.stmt.getAsObject() as DbRow;
    }
    this.stmt.free();
    this.stmt = null;
    return row;
  }
}

function createDb(sqljsDb: any) {
  return {
    prepare(sql: string): Stmt {
      return new Stmt(sqljsDb.prepare(sql));
    },
    exec(sql: string): void {
      sqljsDb.exec(sql);
    },
    close(): void {
      sqljsDb.close();
    },
    export(): Buffer {
      return Buffer.from(sqljsDb.export());
    },
  };
}

export type Database = ReturnType<typeof createDb>;

let db: Database | null = null;
export let dbPath: string | null = null;

export async function initDatabase(databasePath?: string): Promise<void> {
  const resolvedPath = databasePath ?? resolve(expandHome("~/DestinyOS"), "destiny.db");
  dbPath = resolvedPath;

  const dir = resolve(resolvedPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const SQL = await initSqlJs({
    locateFile: (file: string) => resolve(currentDir, file),
  });
  let sqljsDb: any;
  if (existsSync(resolvedPath)) {
    const buffer = readFileSync(resolvedPath);
    sqljsDb = new SQL.Database(buffer);
  } else {
    sqljsDb = new SQL.Database();
  }
  db = createDb(sqljsDb);
  runMigrations(db);
  logger.info("Database initialized at", resolvedPath);
}

function runMigrations(sqlite: Database): void {
  sqlite.exec(`
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

  sqlite.exec(`
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

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    writeFileSync(dbPath, data);
  }
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function persistEvent(event: Event): void {
  const d = getDb();
  d.prepare(
    "INSERT INTO events (id, type, task_id, run_id, step_id, timestamp, payload, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    event.id,
    event.type,
    event.taskId ?? null,
    event.runId ?? null,
    event.stepId ?? null,
    event.timestamp,
    JSON.stringify(event.payload),
    event.metadata ? JSON.stringify(event.metadata) : null,
  );
  saveDatabase();
  logger.debug("Event persisted:", event.type);
}

export function getEventsByType(type: string, limit = 100): Event[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT ?").all(type, limit);
  return rows.map(deserializeEvent);
}

export function getEventsByTaskId(taskId: string): Event[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM events WHERE task_id = ? ORDER BY timestamp DESC").all(taskId);
  return rows.map(deserializeEvent);
}

export function getEventsInRange(from: string, to: string, limit = 500): Event[] {
  const d = getDb();
  const rows = d.prepare(
    "SELECT * FROM events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?"
  ).all(from, to, limit);
  return rows.map(deserializeEvent);
}

export function replayEvents(handler: (event: Event) => void, filter?: { type?: string; taskId?: string }): void {
  const d = getDb();
  let rows: Record<string, unknown>[];
  if (filter?.type) {
    rows = d.prepare("SELECT * FROM events WHERE type = ? ORDER BY timestamp").all(filter.type);
  } else if (filter?.taskId) {
    rows = d.prepare("SELECT * FROM events WHERE task_id = ? ORDER BY timestamp").all(filter.taskId);
  } else {
    rows = d.prepare("SELECT * FROM events ORDER BY timestamp").all();
  }
  for (const row of rows) {
    handler(deserializeEvent(row));
  }
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
