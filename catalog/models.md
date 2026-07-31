# Model host attach points

How to attach Agent Wallclock temporal context on common hosts.

Models only stop inventing time **when a fresh briefing or MCP tools are attached**. Soft prompt adapters do not enforce anything by themselves.

## ChatGPT (web / app)

- **Custom instructions**: paste [`adapters/chatgpt-custom-instructions.md`](../adapters/chatgpt-custom-instructions.md).
- **Per chat**: paste output of `wallclock brief` at the start of a session or when duration matters. Refresh if older than ~15 minutes.
- MCP is not assumed; briefing paste is the portable path.
- Pasting a briefing uploads that time data to the host.

## Claude (claude.ai / Projects)

- **Project instructions**: paste [`adapters/claude-project-instructions.md`](../adapters/claude-project-instructions.md).
- **Claude Desktop + MCP**: run `wallclock mcp-config --print claude` (or edit [`adapters/mcp/claude-desktop.json`](../adapters/mcp/claude-desktop.json)) and use `get_briefing`.
- Fallback: paste a fresh `wallclock brief`.

## Cursor

- **Skill**: copy [`adapters/cursor-skill/`](../adapters/cursor-skill/) into a personal or project skills directory.
- **User rule**: add the fragment from [`adapters/cursor-skill/rule.md`](../adapters/cursor-skill/rule.md).
- **MCP**: run `wallclock mcp-config --print cursor` (or edit [`adapters/mcp/cursor-mcp.json`](../adapters/mcp/cursor-mcp.json)).
- Agents can run the CLI via absolute `node …/packages/cli/dist/bin.js brief` — do not assume `wallclock` is on PATH.

## Generic API / other hosts

- Put [`adapters/generic-system-prompt.md`](../adapters/generic-system-prompt.md) in the system prompt.
- Include a fresh Temporal Briefing in the first user message or a dedicated context message each session.
