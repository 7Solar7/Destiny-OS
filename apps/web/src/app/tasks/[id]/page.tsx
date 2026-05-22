"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Task } from "@destiny-os/shared";

function statusColor(status: string): string {
  switch (status) {
    case "running": return "#facc15";
    case "completed": return "#22c55e";
    case "failed": return "#ef4444";
    case "cancelled": return "#6b7280";
    default: return "#9ca3af";
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function TaskDetail() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/tasks/${taskId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setTask(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  if (loading) return <p style={{ color: "#6b7280" }}>Loading...</p>;

  if (!task) {
    return (
      <div>
        <h1 style={{ color: "#ef4444" }}>Task not found</h1>
        <a href="/" style={{ color: "#60a5fa" }}>← Back to dashboard</a>
      </div>
    );
  }

  return (
    <div>
      <a href="/" style={{ color: "#60a5fa", textDecoration: "none", fontSize: 14, display: "block", marginBottom: 16 }}>
        ← Back to dashboard
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{task.title}</h1>
        <span style={{
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          background: statusColor(task.status),
          color: "#000",
        }}>
          {task.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <DetailCard label="ID" value={task.id} />
        <DetailCard label="Priority" value={task.priority} />
        <DetailCard label="Goal" value={task.goal} />
        <DetailCard label="Created" value={new Date(task.createdAt).toLocaleString()} />
        {task.description && <DetailCard label="Description" value={task.description} />}
        {task.completedAt && <DetailCard label="Completed" value={new Date(task.completedAt).toLocaleString()} />}
        {task.tags && <DetailCard label="Tags" value={task.tags.join(", ")} />}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>
        Runs ({task.runs.length})
      </h2>

      {task.runs.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No runs yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {task.runs.map((run) => (
            <div
              key={run.id}
              style={{
                background: "#111",
                borderRadius: 8,
                border: "1px solid #222",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: statusColor(run.status), fontWeight: 700 }}>
                  {run.status === "running" ? "●" : run.status === "completed" ? "✓" : "✗"}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "#6b7280" }}>
                  {run.id.slice(0, 8)}
                </span>
                <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 13 }}>
                  {formatDuration(run.duration)}
                </span>
              </div>
              {run.steps.length > 0 && (
                <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                  {run.steps.map((step) => (
                    <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span style={{ color: statusColor(step.status) }}>
                        {step.status === "running" ? "●" : step.status === "completed" ? "✓" : "✗"}
                      </span>
                      <span style={{ color: "#9ca3af" }}>{step.type}</span>
                      <span style={{ marginLeft: "auto", color: "#6b7280" }}>
                        {formatDuration(step.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#111", borderRadius: 8, border: "1px solid #222", padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#e0e0e0", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}
