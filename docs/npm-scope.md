# npm scope: `@agent-wallclock`

The `@agent-wallclock` npm scope is **org-owned** under [TelivityAI](https://github.com/TelivityAI).

## Packages (planned / private monorepo)

| Package | Purpose |
|---------|---------|
| `@agent-wallclock/core` | Clock, store, briefing logic |
| `@agent-wallclock/cli` | `wallclock` CLI binary |
| `@agent-wallclock/mcp` | Local stdio MCP server |

Current repo version: **0.1.0** (workspace packages, root `"private": true`).

## Ownership

- Scope registration and package names are controlled by TelivityAI maintainers.
- External publishes to `@agent-wallclock/*` without org approval are not permitted.
- Dependabot and CI may bump dependencies; **npm publish** is maintainer-gated.

## Installing from source (today)

Public install path is **clone + build + link**, not npm registry:

```bash
git clone https://github.com/TelivityAI/agent-wallclock.git
cd agent-wallclock
npm install && npm run build
npm link -w @agent-wallclock/cli
```

One-off:

```bash
npm exec -w @agent-wallclock/cli -- wallclock --help
```

## Future registry publish

When packages are published to npm:

- Versions will follow semver starting at `0.1.0`
- Release notes via GitHub Releases (see `.github/release.yml` / [`RELEASE_NOTES_TEMPLATE.md`](RELEASE_NOTES_TEMPLATE.md))
- Provenance and 2FA will be required for org publishes

## Related docs

- [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`CHANGELOG.md`](../CHANGELOG.md)
- [`docs/SHIP_CHECKLIST.md`](SHIP_CHECKLIST.md)
