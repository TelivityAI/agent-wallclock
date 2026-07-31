## Summary

<!-- What changed and why (1–3 sentences). -->

## Type

- [ ] fix/pass batch (`fix/pass-NNN-slug`)
- [ ] Feature (`feat/…`)
- [ ] Docs only
- [ ] Chore / deps

## Test plan

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run smoke`
- [ ] `wallclock doctor` (if CLI/MCP touched)
- [ ] Adapters updated if `MODEL_RULES` or briefing shape changed

## No-leak

- [ ] No home paths (`/Users/…`) or tokens in diff
- [ ] MCP paths use placeholders or `mcp-config --print` output redacted

## Screenshots / docs

- [ ] MOCK images still labeled MOCK
- [ ] No fake product UI presented as real

## Related

<!-- Issues, pass batch name (e.g. fix/pass-hardening-100), prior PRs -->
