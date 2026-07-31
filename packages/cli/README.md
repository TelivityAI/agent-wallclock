# @agent-wallclock/cli

Command-line interface for Agent Wallclock (`wallclock` binary).

**License:** Apache-2.0

## Install from source

```bash
cd /ABSOLUTE/PATH/TO/agent-wallclock
npm install && npm run build
npm link -w @agent-wallclock/cli
wallclock --help
```

One-off without linking:

```bash
npm exec -w @agent-wallclock/cli -- wallclock now
node packages/cli/dist/bin.js doctor
```

## Common commands

| Command | Purpose |
|---------|---------|
| `wallclock now` | Local time snapshot |
| `wallclock brief [--copy\|--json\|--compact]` | Temporal Briefing |
| `wallclock doctor` | Health checks |
| `wallclock where` | Store and paths |
| `wallclock mcp-config --print <claude\|cursor\|vscode>` | MCP JSON |
| `wallclock init` | Initialize store |

Full list: `wallclock --help` or [README](../../README.md).

## Environment

- `AGENT_WALLCLOCK_HOME` — store directory
- `AGENT_WALLCLOCK_STALE_AFTER_MS` — briefing freshness window

No network calls. Pasting a briefing uploads data to the host you paste into.

## Build

```bash
npm run build -w @agent-wallclock/cli
```

Depends on `@agent-wallclock/core`.
