# Troubleshooting

Common problems when building, linking, or running Agent Wallclock locally.

## Build missing / `wallclock` not found

**Symptoms:** `command not found: wallclock`, or `CLI build missing` from `wallclock doctor`.

**Fix:**

```bash
cd /ABSOLUTE/PATH/TO/agent-wallclock
npm install
npm run build
npm link -w @agent-wallclock/cli   # optional but recommended
```

One-off without linking:

```bash
npm exec -w @agent-wallclock/cli -- wallclock --help
# or
node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js --help
```

Cursor agents and MCP configs should use **absolute** paths to `packages/cli/dist/bin.js` and `packages/mcp/dist/server.js` — do not assume `wallclock` is on PATH.

## MCP server path wrong

**Symptoms:** Host shows MCP server failed to start; `wallclock doctor` reports MCP build missing.

**Fix:**

1. Rebuild: `npm run build`
2. Regenerate config:

```bash
wallclock mcp-config --print cursor --check
wallclock mcp-config --print claude --check
wallclock mcp-config --print vscode --check
```

3. Merge the printed JSON into your host MCP settings (Claude Desktop, Cursor, VS Code).
4. Restart the host.

Templates in `adapters/mcp/` use `/ABSOLUTE/PATH/TO/agent-wallclock` — replace with your clone path or prefer `mcp-config --print`.

## Stale briefing

**Symptoms:** Model quotes old local time or session age; briefing **Generated at** is more than ~15 minutes ago.

**Fix:**

- Run `wallclock brief --copy` and paste again, or
- Call MCP `get_briefing` before time-based advice.

Adjust freshness window (optional):

```bash
export AGENT_WALLCLOCK_STALE_AFTER_MS=900000   # 15m default
```

The briefing includes **Stale after** so models know when to refresh.

## Store lock contention

**Symptoms:** Exit code `6`, message about `store.lock`, or warning that another process holds the lock.

**Cause:** Two CLI or MCP processes wrote the store at once (e.g. parallel agents with writes enabled).

**Fix:**

1. Close duplicate MCP servers or terminal sessions using Wallclock.
2. If a process crashed, stale lock may remain. Wait a moment and retry.
3. Set `AGENT_WALLCLOCK_LOCK_STRICT=1` to fail fast instead of warning (useful in CI).
4. Never delete `store.lock` while another live process is running.

## Corrupt or unreadable store

**Symptoms:** Exit code `5`, `StoreCorruptError`, or JSON parse errors.

**Fix:**

1. Diagnose: `wallclock doctor`
2. Attempt repair: `wallclock doctor --repair` (best-effort normalization)
3. Restore from backup if you have one:

```bash
wallclock store backup /ABSOLUTE/PATH/TO/backups/wallclock-store.json
wallclock store restore /ABSOLUTE/PATH/TO/backups/wallclock-store.json
```

4. Last resort: move aside `~/.agent-wallclock/store.json` and run `wallclock init` (loses ledger history).

Override store location for testing:

```bash
AGENT_WALLCLOCK_HOME=/tmp/wallclock-test wallclock init
```

## Clipboard copy failed

**Symptoms:** `wallclock brief --copy` prints to stdout with a clipboard error.

**Fix:** Use `--copy` only where `pbcopy` / `xclip` / `wl-copy` exists, or pipe manually:

```bash
wallclock brief | pbcopy    # macOS
wallclock brief --json | jq .
```

## MCP write tools disabled

**Symptoms:** `start_effort` or `log_session` returns an error about writes disabled.

**Fix:** Add to the MCP server `env` block in host config:

```json
"AGENT_WALLCLOCK_WRITES": "1"
```

Read tools (`get_now`, `get_briefing`, `list_efforts`, `get_session_status`, `get_timeline`) work without this flag.

## Still stuck?

1. `wallclock where` — show store path and config hints
2. `wallclock doctor` — full check list
3. Open a [bug report](.github/ISSUE_TEMPLATE/bug_report.md) with sanitized output (no home paths, no store contents unless you intend to share them)
