# @agent-wallclock/core

Core library for Agent Wallclock: system clock, local JSON store, efforts, sessions, and Temporal Briefing rendering.

**License:** Apache-2.0

## Exports

- `getNow`, `formatDuration`, `parseDuration`
- `loadStore`, `updateStore`, `initStore`, `backupStore`, `restoreStore`
- Effort and session operations (`startEffort`, `startSession`, `endSession`, …)
- `renderBriefing`, `renderBriefingCompact`, `buildBriefingInput`, `MODEL_RULES`
- `classifyCircadian`, `loadPrefs`, `savePrefs` (opt-in circadian; `config.json`)
- `runDoctor`, `loadConfig`, typed errors (`CliError`, `StoreCorruptError`, …)

## Store

Default directory: `~/.agent-wallclock/` (`store.json`, `store.lock`, optional `config.json` prefs). Override with `AGENT_WALLCLOCK_HOME`.

## Config (environment)

| Variable | Default |
|----------|---------|
| `AGENT_WALLCLOCK_STALE_AFTER_MS` | 15m |
| `AGENT_WALLCLOCK_OPEN_SESSION_WARN_MS` | 4h |
| `AGENT_WALLCLOCK_OPEN_SESSION_SOFT_CAP_MS` | 8h |

See [`docs/architecture.md`](../../docs/architecture.md).

## Build and test

```bash
npm run build -w @agent-wallclock/core
npm test -w @agent-wallclock/core
```

Used by `@agent-wallclock/cli` and `@agent-wallclock/mcp` — not typically imported by end users directly.
