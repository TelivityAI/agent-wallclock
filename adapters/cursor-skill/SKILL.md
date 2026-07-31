---
name: agent-wallclock
description: >-
  Keep agents temporally grounded using Agent Wallclock. Use when answering
  about time of day, how long a session has run, project effort duration, or
  when tempted to invent sleep/rest advice from guessed time.
---

# Agent Wallclock

## Instructions

1. Before making claims about local time, session length, or effort duration, obtain a **fresh** Temporal Briefing:
   - **Prefer MCP** tool `get_briefing` when the Agent Wallclock MCP server is configured.
   - Also available read tools: `get_now`, `list_efforts`, `get_session_status`, `get_timeline`.
   - If MCP is unavailable, ask the user to paste `wallclock brief`, or run the CLI via:
     - `npm exec -w @agent-wallclock/cli -- wallclock brief` from the repo root, or
     - `node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js brief`
   - **Do not** assume bare `wallclock` is on PATH — use `npm exec` or an absolute `node` path.
2. Check **Generated at** / **Stale after**. If **Generated-at** is older than the freshness window (default 15 minutes), refresh before time-based advice.
3. Treat the briefing as authoritative. Do not invent:
   - time of day / “it’s late”
   - session age (“hours”, “days”)
   - effort history on multi-week work
4. If briefing data is missing, say **unknown** — never guess from priors.
5. Do not advise sleep or “you’ve done enough” based on invented duration.
6. Write tools (`start_effort`, `log_session`) require `AGENT_WALLCLOCK_WRITES=1` — default off.

## Install skill

Copy this folder to:

- `~/.cursor/skills/agent-wallclock/` (user-wide), or
- `.cursor/skills/agent-wallclock/` in your project

Add the rule fragment from [`rule.md`](rule.md) to Cursor user rules if desired.

## Rule fragment (user rules)

```
Temporal context: Use Agent Wallclock. Never invent clock time, session age, or effort duration. Prefer MCP get_briefing or npm exec / absolute node path — not bare wallclock. Refresh if stale; missing fields are unknown.
```
