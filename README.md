# Agent Wallclock

**Stop language models from inventing the time.**

Agent Wallclock is a small **local** tool. It reads your real clock and a local effort ledger, then produces a **Temporal Briefing**. You feed that briefing into Claude, ChatGPT, Cursor, or any other model — via paste, custom instructions, or MCP tools.

This is not a hosted product and not a chat UI. It is plumbing so *any* model can stop saying “go to sleep” at 9:30am or “you’ve been at this for days” twelve minutes in.

---

## How it works (one picture in your head)

```text
┌─────────────────────┐     wallclock brief      ┌──────────────────────┐
│  Your machine       │ ───────────────────────► │  Claude / ChatGPT /  │
│  • system clock     │   (paste or MCP tool)    │  Cursor / any API    │
│  • ~/.agent-wallclock│                          │  reads the briefing  │
└─────────────────────┘                          └──────────────────────┘
```

1. **CLI / MCP** on your machine measure real time and logged effort.
2. They emit a **Temporal Briefing** (markdown).
3. The model only “knows” time if you **give it that briefing** (or it calls MCP `get_briefing`).
4. Host adapters (custom instructions / skills) tell the model: **trust the briefing; never invent durations.**

No cloud sync. No account. The model never sees your store unless you paste a briefing or enable local MCP.

---

## Demo: generate a briefing

```bash
git clone https://github.com/TelivityAI/agent-wallclock.git
cd agent-wallclock
npm install && npm run build

# optional alias
alias wallclock='node '"$PWD"'/packages/cli/dist/bin.js'

wallclock init
wallclock effort start auth-rewrite
wallclock session start
wallclock brief          # print
wallclock brief --copy   # copy to clipboard when available
```

Example output:

![Terminal showing wallclock brief](docs/images/01-cli-brief.png)

```markdown
# Temporal Briefing (Agent Wallclock)

## Now
- Local date: 2026-07-30
- Local time: 09:30:12
- Weekday: Thursday
- Timezone: America/Chicago (Central Daylight Time, UTC-05:00)
- ISO (UTC): ...

## Active session
- Status: open
- Age: 12m

## Active effort
- Name: auth-rewrite
- Calendar age: 3w 2d
- Logged work time: 14h 20m
...
```

That block is the whole product surface. Everything below is **how each host receives it**.

*(Images below are illustrative walkthroughs of the real CLI / host setup flow.)*

---

## ChatGPT — how it gets the data

ChatGPT cannot read your disk. You give it two things:

| Piece | What you do |
|-------|-------------|
| Standing rules | Paste [`adapters/chatgpt-custom-instructions.md`](adapters/chatgpt-custom-instructions.md) into **Customize ChatGPT → Custom instructions** |
| Live clock | At the start of a session (or when time matters), paste `wallclock brief` into the chat |

![ChatGPT custom instructions + pasted briefing](docs/images/02-chatgpt-setup.png)

**Checklist**

1. Open ChatGPT → profile → **Customize ChatGPT**.
2. Put the adapter text in custom instructions.
3. Run `wallclock brief --copy` on your machine.
4. Paste into the chat before asking anything time-sensitive.
5. Ask: “What time is it for me, and how long have I been on auth-rewrite?” — it should quote the briefing, not invent numbers.

---

## Claude — how it gets the data

Two paths (pick one or both):

### A) Paste (works everywhere: claude.ai, Projects, API)

1. Add [`adapters/claude-project-instructions.md`](adapters/claude-project-instructions.md) to a **Project**’s instructions (or custom instructions).
2. Paste `wallclock brief` into the chat when you start work.

![Claude chat using a Temporal Briefing](docs/images/03-claude-chat.png)

### B) MCP (Claude Desktop)

1. `npm install && npm run build` in this repo.
2. Copy [`adapters/mcp/claude-desktop.json`](adapters/mcp/claude-desktop.json) into Claude Desktop MCP config.
3. Replace `/ABSOLUTE/PATH/TO/agent-wallclock` with your clone path.
4. Restart Claude Desktop.
5. Ask Claude to call **`get_briefing`** before time-based advice.

Claude then pulls the same local store the CLI uses — still on your machine, still no upload from the Wallclock process itself.

---

## Cursor — how it gets the data

Three paths (combine freely):

| Path | What |
|------|------|
| Terminal | Agent runs `wallclock brief` (or you paste it) |
| Skill / rule | Copy [`adapters/cursor-skill/`](adapters/cursor-skill/) into your skills dir; add the rule fragment from `rule.md` |
| MCP | Add [`adapters/mcp/cursor-mcp.json`](adapters/mcp/cursor-mcp.json), point `args` at `packages/mcp/dist/server.js`, enable the server |

![Cursor MCP with agent-wallclock tools](docs/images/04-cursor-mcp.png)

**MCP tools:** `get_now`, `get_briefing`, `list_efforts`, `start_effort`, `log_session`.

When the skill/rule is on, Cursor should call `get_briefing` (or run the CLI) instead of guessing “it’s late” or “you’ve been grinding for days.”

---

## Before / after (why this exists)

| Without Wallclock | With a fresh briefing |
|-------------------|------------------------|
| “It’s late — you should sleep.” (it’s 9:30am) | “Local time is 09:30 Thursday.” |
| “You’ve been at this for days.” (12 minutes) | “This session is 12 minutes old.” |
| “New chat = new project.” | “Effort `auth-rewrite` has 14h logged over ~3 weeks.” |

---

## Install

```bash
git clone https://github.com/TelivityAI/agent-wallclock.git
cd agent-wallclock
npm install
npm run build
node packages/cli/dist/bin.js --help
```

Requirements: Node.js 20+.

---

## Commands

| Command | Purpose |
|---------|---------|
| `wallclock now` | Local date, time, timezone, weekday, ISO |
| `wallclock brief` | Full Temporal Briefing (`--copy` when supported) |
| `wallclock effort start\|list\|status\|log` | Named efforts + cumulative time |
| `wallclock session start\|end` | Open/close a work block on an effort |
| `wallclock timeline` | Recent sessions |
| `wallclock init` | Create `~/.agent-wallclock/` and point at adapters |

Override store directory: `AGENT_WALLCLOCK_HOME=/path node packages/cli/dist/bin.js ...`

---

## Privacy

- State lives only under `~/.agent-wallclock/` (JSON).
- CLI and MCP make **no network calls**.
- A model sees time data only if **you** paste a briefing or enable local MCP in that host.

---

## Repo map

| Path | Role |
|------|------|
| `packages/core` | Clock, store, efforts, sessions, briefing text |
| `packages/cli` | `wallclock` binary |
| `packages/mcp` | Local stdio MCP server |
| `adapters/` | Copy-paste instructions per host |
| `catalog/models.md` | Attach points cheat sheet |
| `docs/images/` | Demo screenshots used above |

---

## License

Apache-2.0
