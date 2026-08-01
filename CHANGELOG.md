# Changelog

All notable changes to Agent Wallclock are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning starts at **0.1.0** for the first public QA-ready release.

## [Unreleased]

### Added

- **CLI:** `wallclock circadian on|off|status` — opt-in Circadian context in Temporal Briefing (default off)
- **Core:** `config.json` prefs (`circadianEnabled`) separate from `store.json`; `classifyCircadian` fixed local-hour bands
- **Briefing:** optional `## Circadian` block (band / day / non-moralizing tone hint) when enabled; compact line `circadian <band> <dayKind>`

## [0.1.0] — 2026-07-31

First post-QA hardening release batch (`fix/pass-hardening-100`).

### Added

- **CLI:** `wallclock doctor`, `wallclock where`, `wallclock --version`, shell `completion`
- **CLI:** `wallclock brief --json` and `--compact`
- **CLI:** `wallclock store backup` / `store restore`
- **CLI:** `wallclock session status`
- **CLI:** `wallclock effort rename`, `archive`, `unarchive`, `delete --confirm`
- **CLI:** `wallclock mcp-config --print vscode` (alongside claude/cursor)
- **MCP:** `get_session_status`, `get_timeline` read tools
- **MCP:** `log_session` with `start` / `end` / `manual` actions (writes gated)
- **Core:** Store v2 migration path, lock handling, `runDoctor` checks
- **Docs:** Architecture, pass PR naming, no-leak and ship checklists, troubleshooting, contributing, security policy
- **GitHub:** PR/issue templates, Dependabot, CODEOWNERS, release notes template

### Changed

- Briefing includes explicit **Freshness** block (`Generated at`, `Stale after`)
- `MODEL_RULES` synced across adapters (freshness TTL language, no invented durations)
- README honest about paste/MCP trust boundaries and MOCK illustrative screenshots
- MCP write tools remain opt-in via `AGENT_WALLCLOCK_WRITES=1`

### Fixed

- Hardening pass: exit codes, store repair path, MCP smoke coverage for new tools

[0.1.0]: https://github.com/TelivityAI/agent-wallclock/releases/tag/v0.1.0
