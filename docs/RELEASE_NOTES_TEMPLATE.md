# Release notes template

Copy into GitHub Releases when tagging `vX.Y.Z`.

---

## Agent Wallclock vX.Y.Z

One-line summary of the release.

### Highlights

- Bullet 1
- Bullet 2

### Added

- …

### Changed

- …

### Fixed

- …

### Upgrade

```bash
git pull
npm install
npm run build
npm link -w @agent-wallclock/cli   # if you use linked CLI
wallclock doctor
```

### MCP hosts

Regenerate MCP config after upgrade:

```bash
wallclock mcp-config --print cursor --check
wallclock mcp-config --print claude --check
```

Restart Claude Desktop / Cursor after updating server paths.

### Breaking changes

None — or list them explicitly.

### Full changelog

See [CHANGELOG.md](https://github.com/TelivityAI/agent-wallclock/blob/main/CHANGELOG.md).

---

**Verify:** `npm test && npm run smoke` on the tagged commit.
