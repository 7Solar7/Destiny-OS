import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/runtime";

export async function GET() {
  const runtime = await getRuntime();
  return NextResponse.json(runtime.getSummary());
}
