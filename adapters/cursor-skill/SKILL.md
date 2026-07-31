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
   - Prefer MCP tool `get_briefing` when the Agent Wallclock MCP server is configured.
   - Otherwise ask the user to paste `wallclock brief`, or run the CLI via an absolute path:
     `node /ABSOLUTE/PATH/TO/agent-wallclock/packages/cli/dist/bin.js brief`
     (or `npm exec -w @agent-wallclock/cli -- wallclock brief` from the clone).
   - Do not assume `wallclock` is on PATH.
2. Check **Generated at** / **Stale after**. If older than the freshness window (default 15 minutes), refresh before time-based advice.
3. Treat the briefing as authoritative. Do not invent:
   - time of day / “it’s late”
   - session age (“hours”, “days”)
   - effort history on multi-week work
4. If briefing data is missing, say **unknown** — never guess from priors.
5. Do not advise sleep or “you’ve done enough” based on invented duration.
6. Optional read tools: `get_now`, `list_efforts`. Write tools (`start_effort`, `log_session`) require `AGENT_WALLCLOCK_WRITES=1`.

## Rule fragment (user rules)

```
Temporal context: Use Agent Wallclock. Never invent clock time, session age, or effort duration. Prefer get_briefing or a fresh wallclock brief; refresh if stale; missing fields are unknown.
```
