# Contributing

Thanks for helping improve Agent Wallclock. This project is local-first temporal context for language models — contributions should preserve that honesty.

## Before you start

1. Read [`README.md`](README.md) for product scope (not a hosted chat UI).
2. Run the [no-leak checklist](docs/NO_LEAK_CHECKLIST.md) before pushing.
3. For pass-batch work, follow [`docs/PASS_PR_NAMING.md`](docs/PASS_PR_NAMING.md).

## Development setup

```bash
git clone https://github.com/TelivityAI/agent-wallclock.git
cd agent-wallclock
npm install
npm run build
npm link -w @agent-wallclock/cli
```

Verify:

```bash
wallclock now
wallclock doctor
```

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Pass / hardening | `fix/pass-NNN-slug` | `fix/pass-hardening-100` |
| Feature | `feat/short-slug` | `feat/timeline-json` |
| Docs only | `docs/short-slug` | `docs/mcp-readme` |
| Chore | `chore/short-slug` | `chore/ci-node-22` |

## Tests required

Every PR that changes behavior must pass:

```bash
npm test          # unit tests (@agent-wallclock/core)
npm run smoke     # build + CLI smoke + MCP smoke
```

CI runs the same on Ubuntu with Node 22. Fix failures before requesting review.

## Pull requests

- Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
- One logical change per PR when possible.
- Update adapters when `MODEL_RULES` or briefing shape changes (`adapters/*`, `catalog/models.md`).
- Docs must stay honest: no fake product screenshots; label illustrative UI as **MOCK**.
- Use path placeholders (`/ABSOLUTE/PATH/TO/...`) — never commit home directories or tokens.

## Code style

- TypeScript in `packages/*`, ESM, Node 20+
- Match existing naming and error handling (`CliError`, `ExitCode`)
- Minimize scope — focused diffs over drive-by refactors

## Adapters and MODEL_RULES

`packages/core/src/brief.ts` exports `MODEL_RULES`. Host adapters should stay aligned on:

- Trust briefing only while fresh (**Generated at** / **Stale after**, default 15m)
- Never invent time, session age, or effort duration
- Missing fields → unknown

## Release and ship

Maintainers use [`docs/SHIP_CHECKLIST.md`](docs/SHIP_CHECKLIST.md) before tagging. Contributors do not need to cut releases unless asked.

## Questions

Open a [feature request](.github/ISSUE_TEMPLATE/feature_request.md) or discussion issue. For vulnerabilities, see [`SECURITY.md`](SECURITY.md).
