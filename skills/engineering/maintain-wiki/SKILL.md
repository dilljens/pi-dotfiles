---
name: maintain-wiki
description: Create and maintain a codebase wiki at docs/wiki/ for AI navigation. Generates spatial map, coding standards, and domain docs. Use when user says "make wiki", "refresh wiki", "update wiki", or when docs/wiki/ already exists and code changes have been made.
---

# Maintain Wiki

Codebase wiki at `docs/wiki/`. Three files: spatial map, coding standards, domain docs.

See [REFERENCE.md](REFERENCE.md) for templates and detection heuristics.

## Quick start

```
"make wiki"          → initialize docs/wiki/ (interactive: domains + standards)
"refresh wiki"       → skill changed — re-scan with current templates, keep user decisions
"update wiki"        → code changed — scan code changes, update domain docs
```

## File inventory

| File | Kind | Updated by |
|------|------|-----------|
| `_index.md` | Quickref + architecture map | `make wiki`, `refresh wiki`, `update wiki` |
| `_standards.md` | Rules + practices + patterns | `make wiki` (interactive), `refresh wiki`, `update wiki` |
| `features/*.md` | Domain docs | `make wiki`, `refresh wiki`, `update wiki` |
| `plans/` | Architecture proposals | manual |
| `README.md` | Usage instructions | `make wiki`, `refresh wiki` |

`_index.md` — quickref block at top (build/test commands, key files, domain one-liners), then architecture topology + entry points + "change X → look at Y" table.

`_standards.md` — three sections: `## Rules` (what you MUST not do — catastrophic), `## Practices` (how you SHOULD write new code), `## Patterns` (how code IS written — detected conventions).

`features/<domain>.md` — per-domain doc with architecture, data flow, edge cases, and key functions/components table.

## Workflow: make wiki

1. Detect tech stack from config files (Makefile, CMakeLists.txt, Cargo.toml, package.json, etc.).
2. Read existing docs (README, CONTEXT, AGENTS.md) — link from `_index.md`, don't duplicate content.
3. **Domain detection**: scan imports + directory clusters → propose groupings (2–20 files per domain) → **ask user to approve**.
4. **Standards detection**: detect rules (scan for assertions, panic macros, guard patterns, explicit rules in AGENTS.md/CONTEXT), detect patterns (error handling, naming, module structure conventions), load practices from stack defaults (see REFERENCE.md). Present all three as a single `_standards.md` proposal → **ask user to approve**.
5. Ask scope (source files matching language, exclude tests/generated/build artifacts).
6. Create `docs/wiki/`:
   - `_index.md` — quickref + architecture topology + "change X → look at Y"
   - `_standards.md` — `## Rules` + `## Practices` + `## Patterns`
   - `README.md` — agent decision tree + human reading guide
   - `features/*.md` — one per domain, each with architecture + key functions table
   - `plans/` — empty directory
7. Add `## Codebase Wiki` section to AGENTS.md.

## Workflow: refresh wiki (skill changed)

Use when the maintain-wiki skill itself has been updated — new templates, new heuristics, new patterns to detect. The project's domain assignments and approved standards are preserved; only the wiki's format and detection depth are upgraded.

1. Read the current wiki to extract preserved state: domain names, approved `_standards.md` content.
2. Re-detect tech stack with current heuristics.
3. Re-scan patterns with current detection heuristics (REFERENCE.md) — propose additions to `_standards.md` Patterns section, **ask user to approve**.
4. Regenerate `_index.md` — new template format, same domain registry, updated topology.
5. Regenerate `features/*.md` — each domain doc rewritten with current module doc template. Preserve architectural prose if still accurate; flag staleness.
6. Update `README.md` if the template changed.
7. Report what was upgraded.

## Workflow: update wiki (code changed)

Use when project source code has changed and the wiki needs to reflect it — new files, moved files, new domains, architecture shifts.

1. Scan for new source files not covered by any existing `features/*.md`.
2. Scan for files that moved to a different domain.
3. Check if any existing domain docs reference deleted files.
4. **If new domains found**: propose new domain groupings → **ask user to approve**.
5. Update affected domain docs: architecture changes, new key functions, new edge cases.
6. Regenerate `_index.md` — updated domain registry, topology, file counts.
7. Re-scan patterns — propose additions to `_standards.md` Patterns if new conventions emerged → **ask user to approve**.
8. Report what changed.

## Proactive suggestion

After making code changes, if `docs/wiki/` exists: "N files changed. Run `update wiki` to refresh domain docs?"

After the maintain-wiki skill itself is updated: "The wiki skill has changed. Run `refresh wiki` to upgrade your wiki's format and detection depth?"
