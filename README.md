# Destiny OS

An AI-powered operating system for knowledge work. Execute tasks through an agent loop backed by Gemini or Claude Code, with a CLI (TUI + commands) and web dashboard.

## Quick Start

```bash
# Initialize vault and config
npm run ago init

# Run a task
npm run ago run "summarize my project"

# Configure AI provider
npm run ago config runtime.provider gemini
npm run ago config runtime.apiKey <your-key>

# Launch web dashboard
npm run ago web --port 3456

# Launch terminal UI
npm run ago
```

## Project Structure

```
apps/
  cli/       Commander CLI with Ink-based TUI
  web/       Next.js 16 web dashboard (App Router, SSE)
packages/
  shared/    Zod schemas, types, config loader
  runtime/   EventBus, sqlite persistence, agent loop, providers
  memory/    Memory and vault management
  memory-engine/  Embeddings and retrieval
  integrations/   External service adapters
  skills/         Skill system
```

## AI Providers

Configured via `~/DestinyOS/config.json`:

| Provider      | Model              | Notes                        |
|---------------|--------------------|------------------------------|
| `gemini`      | gemini-2.0-flash   | Google Gemini API (REST)     |
| `claude-code` | (claude CLI)       | Spawns `claude --print`      |

Set via `ago config runtime.<key> <value>` or env vars.

## Commands

```
ago                        Launch terminal UI
ago init                   Initialize ~/DestinyOS
ago run <goal>             Execute a task via agent loop
ago config [key] [value]   View/set configuration
ago status (st)            Show system status
ago logs                   View event logs
ago tasks                  List tasks
ago web                    Launch web dashboard
```

## Architecture

```
CLI (Ink TUI) ───────────┐
                          ├── RuntimeStore ── EventBus ── SQLite
Web Dashboard (Next.js) ──┘

Tasks persist to ~/DestinyOS/destiny.db on every mutation.
Agent loop: Plan → Execute → Observe → Reflect → Finalize (with retry).
```

## Development

```bash
npm run build           # turbo build all packages
npm run ago ...         # run CLI after build
npm run typecheck       # tsc --noEmit across all packages
```

Requires Node.js >= 20.
