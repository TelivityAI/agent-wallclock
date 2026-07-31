# Model host attach points

How to attach Agent Wallclock temporal context on common hosts.

## ChatGPT (web / app)

- **Custom instructions**: paste [`adapters/chatgpt-custom-instructions.md`](../adapters/chatgpt-custom-instructions.md).
- **Per chat**: paste output of `wallclock brief` at the start of a session or when duration matters.
- MCP is not assumed; briefing paste is the portable path.

## Claude (claude.ai / Projects)

- **Project instructions**: paste [`adapters/claude-project-instructions.md`](../adapters/claude-project-instructions.md).
- **Claude Desktop + MCP**: add [`adapters/mcp/claude-desktop.json`](../adapters/mcp/claude-desktop.json) and use `get_briefing`.
- Fallback: paste `wallclock brief`.

## Cursor

- **Skill**: copy [`adapters/cursor-skill/`](../adapters/cursor-skill/) into a personal or project skills directory.
- **User rule**: add the fragment from [`adapters/cursor-skill/rule.md`](../adapters/cursor-skill/rule.md).
- **MCP**: add [`adapters/mcp/cursor-mcp.json`](../adapters/mcp/cursor-mcp.json).
- Agents can also run `wallclock brief` in the terminal.

## Generic API / other hosts

- Put [`adapters/generic-system-prompt.md`](../adapters/generic-system-prompt.md) in the system prompt.
- Include a fresh Temporal Briefing in the first user message or a dedicated context message each session.
