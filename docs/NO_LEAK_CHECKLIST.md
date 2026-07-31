# No-leak pre-push checklist

Run this before every push, PR, screenshot, or release candidate. Agent Wallclock is local-first; leaks in public repos are permanent.

## Paths

- [ ] No home directory paths in diffs (`/Users/…`, `/home/…`, `C:\Users\…`)
- [ ] MCP JSON examples use `/ABSOLUTE/PATH/TO/agent-wallclock` placeholders only
- [ ] Docs and adapters never embed your real clone path — use placeholders or `wallclock mcp-config --print`
- [ ] Screenshots and terminal captures cropped or redacted if they show usernames or paths

## Secrets and credentials

- [ ] No API keys, tokens, `.env` contents, or MCP auth headers in commits
- [ ] No private repo URLs with embedded credentials
- [ ] `store.json` backups are **never** committed (local ledger may contain effort names you consider private)

## Content hygiene

- [ ] No internal Slack/email threads pasted into docs or commit messages
- [ ] No real customer or employer project names unless you intend them to be public
- [ ] Issue/PR descriptions use generic effort names (`auth-rewrite`) in examples

## Automated spot-check

From repo root:

```bash
# Fail if common leak patterns appear in tracked files (adjust as needed)
git diff --cached | grep -E '/Users/|/home/|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]+' && echo 'LEAK DETECTED' || echo 'OK'
```

## MCP and host config

- [ ] Committed MCP templates use placeholder paths only
- [ ] Generated configs with real paths stay in your local host config (Claude Desktop, Cursor), not in git
- [ ] `wallclock mcp-config --print … --check` passes before sharing config snippets

## If you leaked something

1. Rotate any exposed secret immediately.
2. Remove the leak in a follow-up commit (do not rely on `git revert` alone for secrets — assume they were scraped).
3. For published releases, open a maintainer issue; consider a force-push only with maintainer approval.

See also: [`SHIP_CHECKLIST.md`](SHIP_CHECKLIST.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md).
