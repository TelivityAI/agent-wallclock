# @agent-wallclock/mcp

Local **stdio** MCP server exposing Agent Wallclock clock, briefing, and ledger tools.

**License:** Apache-2.0

## Run

After build:

```bash
node /ABSOLUTE/PATH/TO/agent-wallclock/packages/mcp/dist/server.js
```

Prefer generating host config from the CLI:

```bash
wallclock mcp-config --print cursor --check
wallclock mcp-config --print claude --check
wallclock mcp-config --print vscode --check
```

See [`adapters/mcp/README.md`](../../adapters/mcp/README.md).

## Tools

| Tool | Writes | Description |
|------|--------|-------------|
| `get_now` | no | System clock |
| `get_briefing` | no | Full Temporal Briefing (check freshness) |
| `list_efforts` | no | Named efforts + logged time |
| `get_session_status` | no | Open session age or none |
| `get_timeline` | no | Recent sessions (`limit`, `effort`) |
| `start_effort` | yes* | Create/select active effort |
| `log_session` | yes* | `start` / `end` / `manual` session actions |

\*Requires `AGENT_WALLCLOCK_WRITES=1` in server `env`.

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_WALLCLOCK_HOME` | Store directory |
| `AGENT_WALLCLOCK_WRITES=1` | Enable mutating tools |
| `AGENT_WALLCLOCK_STALE_AFTER_MS` | Briefing freshness (via core) |

No network I/O. Trust boundary: host process can read store; with writes enabled, can mutate ledger.

## Dependencies

- `@agent-wallclock/core`
- `@modelcontextprotocol/sdk` (MIT)
- `zod` (MIT) — see [NOTICE](../../NOTICE)

## Build

```bash
npm run build -w @agent-wallclock/mcp
```

Smoke-tested via root `npm run smoke`.
