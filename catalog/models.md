# Model host attach points

How to attach Agent Wallclock temporal context on common hosts.

Models only stop inventing time **when a fresh briefing or MCP tools are attached**. Soft prompt adapters do not enforce anything by themselves.

## ChatGPT (web / app)

- **Custom instructions**: paste [`adapters/chatgpt-custom-instructions.md`](../adapters/chatgpt-custom-instructions.md).
- **Per chat**: paste output of `wallclock brief` at the start of a session or when duration matters. Refresh if **Generated-at** is older than the stated freshness window (~15 minutes default).
- MCP is not assumed; briefing paste is the portable path.
- Pasting a briefing uploads that time data to the host.

## Claude (claude.ai / Projects)

- **Project instructions**: paste [`adapters/claude-project-instructions.md`](../adapters/claude-project-instructions.md).
- **Claude Desktop + MCP**: run `wallclock mcp-config --print claude` (or edit [`adapters/mcp/claude-desktop.json`](../adapters/mcp/claude-desktop.json)) and use `get_briefing`, `get_session_status`, `get_timeline`.
- Fallback: paste a fresh `wallclock brief`.

## Cursor

- **Skill**: copy [`adapters/cursor-skill/`](../adapters/cursor-skill/) to `~/.cursor/skills/agent-wallclock/` or project `.cursor/skills/agent-wallclock/`.
- **User rule**: add the fragment from [`adapters/cursor-skill/rule.md`](../adapters/cursor-skill/rule.md).
- **MCP**: run `wallclock mcp-config --print cursor` (or edit [`adapters/mcp/cursor-mcp.json`](../adapters/mcp/cursor-mcp.json)).
- Agents should use MCP first, else `npm exec -w @agent-wallclock/cli -- wallclock brief` or absolute `node …/packages/cli/dist/bin.js brief` — do not assume `wallclock` is on PATH.

## Generic API / other hosts

Use the **API system-prompt pattern**:

1. **System message**: paste [`adapters/generic-system-prompt.md`](../adapters/generic-system-prompt.md) (or embed `MODEL_RULES` from `wallclock brief --json`).
2. **First user message (or dedicated context message)**: include a fresh Temporal Briefing from `wallclock brief` or your orchestrator calling a local `get_briefing` equivalent.
3. **Refresh**: before time-sensitive tool calls or advice, inject a new briefing if **Generated at** is outside the freshness window.

Example shape (OpenAI-compatible):

```json
{
  "messages": [
    {
      "role": "system",
      "content": "<paste adapters/generic-system-prompt.md>"
    },
    {
      "role": "user",
      "content": "<paste wallclock brief output here>"
    },
    {
      "role": "user",
      "content": "What time is it for me, and how long is my open session?"
    }
  ]
}
```

For JSON pipelines: `wallclock brief --json` includes `generatedAt`, `staleAfterMs`, and `modelRules`.

## Google Gemini (AI Studio / API)

Gemini has no first-class MCP in all surfaces. Use the generic paste path:

- **System instruction** (AI Studio or API `systemInstruction`): paste [`adapters/generic-system-prompt.md`](../adapters/generic-system-prompt.md).
- **User turn**: paste fresh `wallclock brief` at session start; refresh when stale.
- **API**: set `systemInstruction` + include briefing text in the first `contents` user part (same pattern as OpenAI above).

If you run a local MCP bridge, point it at the same store via `AGENT_WALLCLOCK_HOME` and expose briefing text to your gateway — Agent Wallclock does not ship a hosted bridge.

## Other hosts (Copilot, local LLMs, etc.)

- **Paste path**: generic system prompt + periodic `wallclock brief` paste (most portable).
- **MCP path**: any host with stdio MCP can use [`adapters/mcp/README.md`](../adapters/mcp/README.md) and `wallclock mcp-config --print vscode` as a starting point.
- **CLI path**: subprocess `node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js brief --json` from your agent runner.

Always label illustrative UI screenshots as **MOCK** in docs — do not present fake host screenshots as real product captures.

## Privacy reminder

Local CLI/MCP do not network. Pasting or sending briefing text to a cloud API uploads temporal data to that provider.
