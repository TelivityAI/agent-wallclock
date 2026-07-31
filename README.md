# Agent Wallclock

Local-only **wall-clock, session, and effort context** for language model hosts (Claude, ChatGPT, Cursor, APIs, and others).

Models often invent the time of day, session length, or how long a project has been underway. Agent Wallclock produces a **Temporal Briefing** from the system clock and a local ledger so hosts can stay grounded in real time.

## Privacy

- All state stays on the local machine under `~/.agent-wallclock/` (or the OS user config equivalent).
- The CLI and MCP server make **no network calls**. No analytics, accounts, or telemetry.
- Nothing is uploaded. Sharing a briefing with a model is under your control (paste or tool call).

## Install

```bash
git clone https://github.com/TelivityAI/agent-wallclock.git
cd agent-wallclock
npm install
npm run build
```

Run via:

```bash
node packages/cli/dist/bin.js --help
# or, after linking:
npm exec -w @agent-wallclock/cli wallclock -- --help
```

## Quick start

```bash
wallclock init
wallclock effort start auth-rewrite
wallclock session start
wallclock brief
```

Paste the briefing into the chat, or install a host adapter from `adapters/`. MCP-capable hosts can call `get_briefing` instead of pasting.

## Commands

| Command | Purpose |
|---------|---------|
| `wallclock now` | Local date, time, timezone, weekday, ISO timestamp |
| `wallclock brief` | Full Temporal Briefing (`--copy` when supported) |
| `wallclock effort start\|list\|status\|log` | Named efforts and cumulative time |
| `wallclock session start\|end` | Work block bound to an effort |
| `wallclock timeline` | Recent sessions and efforts |
| `wallclock init` | Create local store and print adapter pointers |

## Host adapters

- [`adapters/generic-system-prompt.md`](adapters/generic-system-prompt.md)
- [`adapters/chatgpt-custom-instructions.md`](adapters/chatgpt-custom-instructions.md)
- [`adapters/claude-project-instructions.md`](adapters/claude-project-instructions.md)
- [`adapters/cursor-skill/`](adapters/cursor-skill/)

See [`catalog/models.md`](catalog/models.md) for where to attach context on each host.

## MCP

Local stdio MCP server (same store as the CLI). Example configs: [`adapters/mcp/`](adapters/mcp/).

Tools: `get_now`, `get_briefing`, `list_efforts`, `start_effort`, `log_session`.

## License

Apache-2.0
