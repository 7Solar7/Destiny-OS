import type { Event } from "@destiny-os/shared";

const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController): void {
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController): void {
  clients.delete(controller);
}

export function broadcastEvent(event: Event): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      client.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(client);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
