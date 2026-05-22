import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/runtime";

export async function GET() {
  const runtime = await getRuntime();
  const tasks = runtime.getTasks();
  return NextResponse.json(tasks);
}
