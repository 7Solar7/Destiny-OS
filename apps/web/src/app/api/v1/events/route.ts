import { addClient, removeClient } from "@/lib/sse";
import { getEventBus } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const bus = getEventBus();
  const replayEvents = bus.replay(undefined, 50);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);
      for (const event of replayEvents) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.enqueue(encoder.encode(`event: connected\ndata: {}\n\n`));
    },
    cancel(controller) {
      removeClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
