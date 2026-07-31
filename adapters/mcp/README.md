# MCP configuration

1. Build the repo (`npm install && npm run build`).
2. Prefer generating a filled config (absolute server path included):

```bash
node packages/cli/dist/bin.js mcp-config --print cursor
node packages/cli/dist/bin.js mcp-config --print claude
```

3. Or copy `claude-desktop.json` / `cursor-mcp.json` and replace `/ABSOLUTE/PATH/TO/agent-wallclock` with your clone path.
4. Restart the host.

**Writes default off.** Read tools (`get_now`, `get_briefing`, `list_efforts`) always work. Mutating tools (`start_effort`, `log_session`) require `AGENT_WALLCLOCK_WRITES=1` in the server `env` block.

Optional: set `AGENT_WALLCLOCK_HOME` in the server `env` block to point at a non-default store directory.

The server is stdio-only and performs no network I/O.
