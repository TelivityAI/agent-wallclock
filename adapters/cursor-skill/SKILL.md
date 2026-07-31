---
name: agent-wallclock
description: >-
  Keep agents temporally grounded using Agent Wallclock. Use when answering
  about time of day, how long a session has run, project effort duration, or
  when tempted to invent sleep/rest advice from guessed time.
---

# Agent Wallclock

## Instructions

1. Before making claims about local time, session length, or effort duration, obtain a Temporal Briefing:
   - Prefer MCP tool `get_briefing` when the Agent Wallclock MCP server is configured.
   - Otherwise run `wallclock brief` in the terminal (or ask the user to paste it).
2. Treat the briefing as authoritative. Do not invent:
   - time of day / “it’s late”
   - session age (“hours”, “days”)
   - effort history on multi-week work
3. If briefing data is missing, say **unknown** — never guess from priors.
4. Do not advise sleep or “you’ve done enough” based on invented duration.
5. Optional tools: `get_now`, `list_efforts`, `start_effort`, `log_session`.

## Rule fragment (user rules)

```
Temporal context: Use Agent Wallclock. Never invent clock time, session age, or effort duration. Prefer get_briefing / wallclock brief; missing fields are unknown.
```
