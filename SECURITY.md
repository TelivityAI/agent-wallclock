# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Scope

Agent Wallclock is **local-only** software: CLI and MCP read your system clock and a JSON ledger under `~/.agent-wallclock/`. The project itself makes no outbound network calls.

Security reports should focus on:

- Local privilege escalation or unsafe file permissions
- Store corruption, lock handling, or data loss bugs with security impact
- MCP trust boundary issues (unexpected writes, path traversal in store paths)
- Supply-chain concerns in dependencies (`@modelcontextprotocol/sdk`, `zod`, etc.)

Out of scope for this repo:

- Host-side paste/upload of briefings to Claude, ChatGPT, or Cursor (that is the host’s privacy model)
- Social engineering via model prompts (mitigated by adapters, not enforced in code)

## Reporting a vulnerability

**Preferred:** [GitHub Security Advisories](https://github.com/TelivityAI/agent-wallclock/security/advisories/new) on `TelivityAI/agent-wallclock`.

**Alternative:** Open a **private** security issue if advisories are unavailable — title prefix `[security]`, minimal reproduction, no secrets in the body.

Include:

1. Affected version or commit
2. Steps to reproduce locally
3. Impact assessment (confidentiality / integrity / availability on the user’s machine)
4. Suggested fix if you have one

## Response expectations

Maintainers aim to acknowledge reports within **7 days** and provide a triage update within **14 days**. Critical local data-loss or RCE-class issues are prioritized.

## Safe disclosure

Please do not open public issues with exploit details before a fix is available. We will coordinate disclosure and credit if you wish.

## Hardening defaults

- MCP write tools (`start_effort`, `log_session`) are **off** unless `AGENT_WALLCLOCK_WRITES=1`
- Store directory `0700`, store file `0600` where the OS supports it
- No telemetry or auto-update channels in the core product
