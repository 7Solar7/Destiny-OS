import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MemoryEngine } from "@destiny-os/memory-engine";
import { logger, expandHome } from "@destiny-os/shared";

const TOOLS = [
  {
    name: "read_note",
    description: "Read a note from the vault",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path within the vault",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_note",
    description: "Write a note to the vault",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path within the vault" },
        content: { type: "string", description: "Markdown content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "append_note",
    description: "Append content to a note",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_notes",
    description: "Search notes by content",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_directory",
    description: "List notes in a directory",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_note",
    description: "Delete a note",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_by_tag",
    description: "Search notes by tag",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string" },
      },
      required: ["tag"],
    },
  },
  {
    name: "search_by_title",
    description: "Search notes by title",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_index_stats",
    description: "Get vault index statistics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function createMemoryServer(vaultPath?: string) {
  const engine = new MemoryEngine(vaultPath ?? expandHome("~/DestinyOS/vault"));

  const server = new Server(
    {
      name: "@destiny-os/memory",
      version: "0.0.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "read_note": {
        const path = args?.path as string;
        const entry = engine.read(path);
        if (!entry) {
          return { content: [{ type: "text", text: `Note not found: ${path}` }] };
        }
        return {
          content: [
            {
              type: "text",
              text: `# ${entry.relativePath}\n\n${entry.content}`,
            },
          ],
        };
      }

      case "write_note": {
        const path = args?.path as string;
        const content = args?.content as string;
        engine.write(path, content);
        return { content: [{ type: "text", text: `Written to ${path}` }] };
      }

      case "append_note": {
        const path = args?.path as string;
        const content = args?.content as string;
        engine.append(path, content);
        return { content: [{ type: "text", text: `Appended to ${path}` }] };
      }

      case "search_notes": {
        const query = args?.query as string;
        const results = engine.search(query);
        if (results.length === 0) {
          return { content: [{ type: "text", text: `No results for "${query}"` }] };
        }
        const formatted = results
          .map((r, i) => `${i + 1}. **${r.relativePath}**`)
          .join("\n\n");
        return {
          content: [{ type: "text", text: `Found ${results.length} results:\n\n${formatted}` }],
        };
      }

      case "list_directory": {
        const path = args?.path as string;
        const entries = engine.list(path);
        if (entries.length === 0) {
          return { content: [{ type: "text", text: `Empty directory: ${path}` }] };
        }
        const formatted = entries.map((e) => `- ${e.relativePath}`).join("\n");
        return { content: [{ type: "text", text: `Contents of ${path}:\n\n${formatted}` }] };
      }

      case "delete_note": {
        const path = args?.path as string;
        const result = engine.delete(path);
        return {
          content: [{ type: "text", text: result ? `Deleted: ${path}` : `Not found: ${path}` }],
        };
      }

      case "search_by_tag": {
        const tag = args?.tag as string;
        const results = engine.searchByTag(tag);
        if (results.length === 0) {
          return { content: [{ type: "text", text: `No notes with tag #${tag}` }] };
        }
        const formatted = results.map((r) => `- ${r.relativePath}`).join("\n");
        return { content: [{ type: "text", text: `Notes tagged #${tag}:\n\n${formatted}` }] };
      }

      case "search_by_title": {
        const query = args?.query as string;
        const results = engine.searchByTitle(query);
        if (results.length === 0) {
          return { content: [{ type: "text", text: `No notes matching "${query}"` }] };
        }
        const formatted = results.map((r) => `- ${r.relativePath}`).join("\n");
        return { content: [{ type: "text", text: `Notes matching "${query}":\n\n${formatted}` }] };
      }

      case "get_index_stats": {
        const stats = engine.getIndexStats();
        return {
          content: [
            {
              type: "text",
              text: `Vault Index:\n- Notes: ${stats.totalNotes}\n- Tags: ${stats.totalTags}\n- Words: ${stats.totalWords}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return { server, engine };
}

export async function runMemoryServer(vaultPath?: string): Promise<void> {
  const { server } = createMemoryServer(vaultPath);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Memory MCP server running on stdio");
}
