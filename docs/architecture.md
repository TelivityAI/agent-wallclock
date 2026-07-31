# Architecture

Agent Wallclock is a **local-only** temporal context layer for language models. It does not run a chat UI, sync to the cloud, or call remote APIs.

## Components

```text
┌─────────────────────────────────────────────────────────────┐
│                     Host (Claude / ChatGPT / Cursor)         │
│  • paste briefing  OR  MCP stdio client                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ user-controlled attach
┌───────────────────────────▼─────────────────────────────────┐
│  packages/cli          packages/mcp                          │
│  wallclock binary      stdio MCP server                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  packages/core                                               │
│  clock · store · efforts · sessions · briefing · doctor      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  ~/.agent-wallclock/store.json  (+ store.lock)               │
│  system clock (Date / Intl)                                  │
└─────────────────────────────────────────────────────────────┘
```

| Package | Role |
|---------|------|
| `@agent-wallclock/core` | Shared logic: time formatting, JSON store, briefing renderer, config from env |
| `@agent-wallclock/cli` | User-facing `wallclock` commands |
| `@agent-wallclock/mcp` | MCP tool surface over the same core |

## Store

- **Location:** `~/.agent-wallclock/` by default; override with `AGENT_WALLCLOCK_HOME`.
- **File:** `store.json` — efforts, sessions, active pointers, schema version.
- **Lock:** `store.lock` — exclusive lock for atomic read-modify-write (CLI + MCP).
- **Permissions:** directory `0700`, file `0600` (best effort on Unix).
- **Backup/restore:** `wallclock store backup|restore` for user-managed snapshots.

Store operations are synchronous and local. Corruption triggers `StoreCorruptError`; `wallclock doctor --repair` attempts normalization.

## Briefing

The **Temporal Briefing** is markdown (or JSON with `--json`) built from:

1. System clock (`getNow`)
2. Open session age (if any)
3. Active effort logged time and calendar age
4. **Freshness** metadata: `Generated at`, `Stale after` (default 15 minutes via `AGENT_WALLCLOCK_STALE_AFTER_MS`)

`MODEL_RULES` in the briefing instruct models to trust the briefing only while fresh and never invent durations.

Adapters in `adapters/` propagate the same rules into host-specific instructions.

## MCP trust boundary

The MCP server runs **on the user’s machine** as a child process of the host (stdio transport).

### Read path (default)

Tools: `get_now`, `get_briefing`, `list_efforts`, `get_session_status`, `get_timeline`.

- Read system clock and store
- No network I/O
- Cannot mutate ledger without writes flag

### Write path (opt-in)

Set `AGENT_WALLCLOCK_WRITES=1` in the MCP server environment.

Tools: `start_effort`, `log_session` (`start` / `end` / `manual`).

- Same lock and store as CLI
- Host agent can mutate efforts/sessions — user must trust the host + enabled writes

### Local-only guarantee

Neither CLI nor MCP opens outbound sockets. **Upload happens only when the user pastes a briefing into a cloud host** or when the host sends MCP tool results to its backend — that is outside this repo’s control.

## Configuration

All runtime tuning is environment-based (`packages/core/src/config.ts`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_WALLCLOCK_STALE_AFTER_MS` | 900000 (15m) | Briefing freshness window |
| `AGENT_WALLCLOCK_OPEN_SESSION_WARN_MS` | 4h | Open session warning in briefing |
| `AGENT_WALLCLOCK_OPEN_SESSION_SOFT_CAP_MS` | 8h | Soft-cap note in briefing |
| `AGENT_WALLCLOCK_TIMELINE_LIMIT` | 20 | Default timeline rows |
| `AGENT_WALLCLOCK_LOCK_STRICT` | off | Fail on lock contention |

## Adapters

Host-specific markdown in `adapters/` is **soft enforcement** — models comply only when instructions and fresh data are attached. See [`catalog/models.md`](../catalog/models.md) for attach points.

## Testing

- **Unit:** `npm test` (core store, briefing, clock)
- **Smoke:** `npm run smoke` (CLI + MCP integration scripts)

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).
