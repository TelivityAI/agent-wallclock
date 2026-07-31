# MCP configuration

1. Build the repo (`npm install && npm run build`).
2. Copy `claude-desktop.json` or `cursor-mcp.json` into the host MCP config.
3. Replace `/ABSOLUTE/PATH/TO/agent-wallclock` with the real clone path on the machine.
4. Restart the host.

Optional: set `AGENT_WALLCLOCK_HOME` in the server `env` block to point at a non-default store directory.

The server is stdio-only and performs no network I/O.
