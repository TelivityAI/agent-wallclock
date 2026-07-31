# Pass PR naming

Agent Wallclock uses **pass batches** for coordinated hardening, docs, and adapter work. Each pass is a series of focused pull requests against `main`.

## Branch and PR pattern

```
fix/pass-NNN-slug
```

| Part | Meaning |
|------|---------|
| `fix/` | Prefix for pass/hardening work (not user-facing features) |
| `pass-NNN` | Pass number, zero-padded to three digits (`001`, `042`, `100`) |
| `slug` | Short kebab-case description of the pass scope |

### Examples

- `fix/pass-001-store-migration` — first pass, store version migration
- `fix/pass-042-mcp-tools` — MCP tool additions
- `fix/pass-hardening-100` — **batch umbrella** when several related PRs land together under one pass label

Use a **batch slug** like `pass-hardening-100` when the work spans docs, adapters, CLI polish, and tests in one coordinated merge window. Individual commits inside the branch can still reference sub-slugs in commit messages.

## PR title convention

Match the branch name in the PR title:

```
fix/pass-NNN-slug: one-line summary
```

Example: `fix/pass-hardening-100: docs, adapters, and ship checklist`

## What belongs in a pass PR

- Hardening, bug fixes, docs honesty, adapter sync with `MODEL_RULES`
- Tests and smoke script updates
- No secrets, home paths, or private notes in diffs (see [`NO_LEAK_CHECKLIST.md`](NO_LEAK_CHECKLIST.md))

## What does not use pass naming

- User-facing features: prefer `feat/short-slug`
- Dependency-only bumps: `chore/deps-…` or Dependabot PRs
- Hotfixes on release tags: `fix/release-…` if outside a pass batch
