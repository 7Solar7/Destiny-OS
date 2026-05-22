"use client";

import { useEffect, useState, useCallback } from "react";
import type { Task, Event } from "@destiny-os/shared";

interface Stats {
  tasks: { total: number; running: number; completed: number; failed: number };
  last5Hours: number;
}

function statusColor(status: string): string {
  switch (status) {
    case "running": return "#facc15";
    case "completed": return "#22c55e";
    case "failed": return "#ef4444";
    case "cancelled": return "#6b7280";
    default: return "#9ca3af";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "running": return "● Running";
    case "completed": return "✓ Completed";
    case "failed": return "✗ Failed";
    case "cancelled": return "— Cancelled";
    default: return "○ Pending";
  }
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ tasks: { total: 0, running: 0, completed: 0, failed: 0 }, last5Hours: 0 });
  const [events, setEvents] = useState<Event[]>([]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/v1/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/v1/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  useEffect(() => {
    const es = new EventSource("/api/v1/events");
    es.onmessage = (msg) => {
      try {
        const event: Event = JSON.parse(msg.data);
        setEvents((prev) => [event, ...prev].slice(0, 200));
        if (event.type.startsWith("task.") || event.type.startsWith("run.")) {
          fetchTasks();
          fetchStats();
        }
      } catch { /* ignore malformed */ }
    };
    es.onerror = () => {};
    return () => es.close();
  }, [fetchTasks, fetchStats]);

  return (
    <div>
      <section style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total" value={stats.tasks.total} color="#60a5fa" />
        <StatCard label="Running" value={stats.tasks.running} color="#facc15" />
        <StatCard label="Completed" value={stats.tasks.completed} color="#22c55e" />
        <StatCard label="Failed" value={stats.tasks.failed} color="#ef4444" />
        <StatCard label="Events (5h)" value={stats.last5Hours} color="#a78bfa" />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
            Tasks
          </h2>
          {tasks.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No tasks yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map((task) => (
                <a
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: "#111",
                    borderRadius: 8,
                    border: "1px solid #222",
                    textDecoration: "none",
                    color: "#e0e0e0",
                  }}
                >
                  <span style={{ color: statusColor(task.status), fontWeight: 700 }}>
                    {statusLabel(task.status)}
                  </span>
                  <span style={{ fontWeight: 500 }}>{task.title}</span>
                  <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 13 }}>
                    {task.priority}
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
            Live Activity
          </h2>
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              background: "#111",
              borderRadius: 8,
              border: "1px solid #222",
              padding: 8,
            }}
          >
            {events.slice(0, 50).map((event) => (
              <div
                key={event.id}
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #1a1a1a",
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: "#60a5fa", fontFamily: "monospace", fontSize: 12 }}>
                  {event.type}
                </span>
                {event.taskId && (
                  <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>
                    {event.taskId.slice(0, 8)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px 20px",
        background: "#111",
        borderRadius: 8,
        border: "1px solid #222",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}
