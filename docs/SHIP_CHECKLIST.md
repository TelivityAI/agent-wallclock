# Ship checklist

Use before merging a pass batch or tagging a release (e.g. `v0.1.0`).

## Tests

- [ ] `npm install` clean on Node 20+
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (core unit tests)
- [ ] `npm run smoke` passes (CLI + MCP smoke scripts)
- [ ] CI green on the PR branch

## Local verification

```bash
wallclock now
wallclock doctor
wallclock brief --compact
wallclock mcp-config --print cursor --check
```

- [ ] `doctor` reports store, CLI build, MCP build OK
- [ ] Fresh briefing shows **Generated at** and **Stale after**

## Docs honesty

- [ ] README install path is single canonical flow (clone → install → build → link)
- [ ] Images `02`–`04` labeled **MOCK** (illustrative UI only)
- [ ] Image `01` is real CLI or clearly described as captured output
- [ ] No fake ChatGPT/Claude/Cursor product screenshots presented as real
- [ ] Privacy section covers clipboard paste + MCP host read/write when writes enabled
- [ ] Commands and MCP tools tables match CLI/MCP source
- [ ] Adapters aligned with `MODEL_RULES` freshness language

## No leaks

- [ ] [`NO_LEAK_CHECKLIST.md`](NO_LEAK_CHECKLIST.md) complete
- [ ] No `/Users/` or home paths in diff
- [ ] MCP examples use `/ABSOLUTE/PATH/TO/...` placeholders
- [ ] No tokens, `.env`, or personal store backups in commits

## Release artifacts (when tagging)

- [ ] [`CHANGELOG.md`](../CHANGELOG.md) updated for the version
- [ ] GitHub Release notes from template (`.github/release.yml` or [`RELEASE_NOTES_TEMPLATE.md`](RELEASE_NOTES_TEMPLATE.md))
- [ ] Tag `vX.Y.Z` matches `package.json` / workspace versions
- [ ] [`SECURITY.md`](../SECURITY.md) supported versions table updated if needed

## Post-ship

- [ ] Verify issue/PR templates render on GitHub
- [ ] Dependabot PRs triaged or merged
- [ ] Announce breaking changes in release notes only if semver major (future)
