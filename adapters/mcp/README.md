# MCP configuration

1. Build the repo (`npm install && npm run build`).
2. Prefer generating a filled config (absolute server path included):

```bash
node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js mcp-config --print cursor --check
node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js mcp-config --print claude --check
node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js mcp-config --print vscode --check
```

Or, if `wallclock` is linked:

```bash
wallclock mcp-config --print cursor --check
```

3. Or copy `claude-desktop.json` / `cursor-mcp.json` and replace `/ABSOLUTE/PATH/TO/agent-wallclock` with your clone path.
4. Restart the host (Claude Desktop, Cursor, or VS Code with MCP support).

## Tools

| Tool | Access | Notes |
|------|--------|-------|
| `get_now` | read | Local wall clock |
| `get_briefing` | read | Temporal Briefing — check **Generated at** / **Stale after** (default 15m) |
| `list_efforts` | read | Efforts + logged durations |
| `get_session_status` | read | Open session live age |
| `get_timeline` | read | Recent sessions; optional `limit`, `effort` |
| `start_effort` | write | Requires `AGENT_WALLCLOCK_WRITES=1` |
| `log_session` | write | `action`: `start` \| `end` \| `manual` — requires writes flag |

**Writes default off.** Read tools always work. Mutating tools require `AGENT_WALLCLOCK_WRITES=1` in the server `env` block:

```json
"env": {
  "AGENT_WALLCLOCK_WRITES": "1"
}
```

Optional: set `AGENT_WALLCLOCK_HOME` in the server `env` block for a non-default store directory.

## VS Code

Use `wallclock mcp-config --print vscode` for a starter JSON fragment. Merge into your VS Code MCP settings per current extension docs, then restart.

## Trust boundary

- Server is **stdio-only** — no outbound network from Agent Wallclock.
- Host can read your local store via read tools.
- With writes enabled, host agents can mutate efforts/sessions under the same lock as the CLI.

See [`docs/architecture.md`](../../docs/architecture.md).
