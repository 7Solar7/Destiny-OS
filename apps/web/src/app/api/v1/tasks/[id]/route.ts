import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/runtime";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runtime = await getRuntime();
  const task = runtime.getTask(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}
