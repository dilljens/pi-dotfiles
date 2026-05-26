---
name: wiki
description: "Create and maintain a codebase wiki at docs/wiki/ for AI navigation. Wiki commands: /wiki:make (initialize), /wiki:onboard (cold-start walkthrough), /wiki:update (refresh after code changes), /wiki:sync (upgrade after wiki skill changes), /wiki:check (verify consistency)." 
---

# Wiki

Codebase wiki at `docs/wiki/`. Run `/wiki:make` to initialize, then `/wiki:update` after code changes.

See [REFERENCE.md](REFERENCE.md) for templates and detection heuristics.

## Dispatch

When loaded, determine the subcommand from the user's message. **Run only the matched workflow** — do not list or describe all workflows.

| If user message contains | Run workflow |
|--------------------------|-------------|
| `/wiki:make` | [`/wiki:make`](#workflow-wikimake) — Initialize wiki (interactive) |
| `/wiki:onboard` | [`/wiki:onboard`](#llm-onboarding-cold-start) — Cold-start walkthrough for zero-context LLM — read the onboarding section below |
| `/wiki:update` | [`/wiki:update`](#workflow-wikiupdate) — Refresh after code changes |
| `/wiki:sync` | [`/wiki:sync`](#workflow-wikisync) — Upgrade after wiki skill changes |
| `/wiki:check` | [`/wiki:check`](#workflow-wikicheck) — Verify wiki consistency |
| `/wiki` or `/skill:wiki` | Show quick start summary below + ask which subcommand |
| docs/wiki/ exists + code changed | Run [`/wiki:update`](#workflow-wikiupdate) — code changed, wiki likely stale |

## Quick start

```
/wiki:make      → initialize docs/wiki/ (interactive: domains + standards + glossary)
/wiki:onboard   → cold-start walkthrough of wiki for zero-context LLM
/wiki:update    → code changed — scan code changes, update domain docs
/wiki:sync      → skill changed — re-scan with current templates, preserve user decisions
/wiki:check     → verify consistency (cross-refs, links, orphaned files)
```

## File inventory

| File | Kind | Updated by |
|------|------|-----------|
| `_index.md` | Quickref + architecture map | `/wiki:make`, `/wiki:sync`, `/wiki:update` |
| `_standards.md` | Rules + practices + patterns | `/wiki:make` (interactive), `/wiki:sync`, `/wiki:update` |
| `features/*.md` | Domain docs | `/wiki:make`, `/wiki:sync`, `/wiki:update` |
| `_glossary.md` | Domain terminology | `/wiki:make` |
| `plans/` | Architecture proposals | manual |
| `README.md` | Usage instructions | `/wiki:make`, `/wiki:sync`, `/wiki:update` |

## Subskills

| Subskill | What it does |
|----------|-------------|
| [`install-wiki-hooks`](install-wiki-hooks/SKILL.md) | Git post-commit hook that warns when wiki is stale after source changes |

`_index.md` — quickref block at top (build/test commands, key files, domain one-liners), then architecture topology + entry points + "change X → look at Y" table.

`_standards.md` — three sections: `## Rules` (what you MUST not do — catastrophic), `## Practices` (how you SHOULD write new code), `## Patterns` (how code IS written — detected conventions).

`features/<domain>.md` — per-domain doc with architecture, data flow, edge cases, key functions/components, and testing strategy.

`_glossary.md` — project-specific terms, acronyms, and definitions.

`plans/` — architecture proposals and migration plans (manual).

## LLM onboarding (cold start)

When an AI agent enters this codebase with zero context, the wiki files should be read in this order to build a mental model efficiently:

```
1. `_glossary.md`        — learn project vocabulary first (terms, acronyms)
2. `_index.md`            — architecture topology, domain map, entry points
3. `_standards.md` § Rules     — what is catastrophic (never do this)
4. `_standards.md` § Practices — how new code SHOULD be written
5. `features/<domain>.md`     — the domain you're about to work in
6. `_standards.md` § Patterns  — match existing conventions before writing
```

`_glossary.md` goes first because without the project's vocabulary, every subsequent doc is harder to parse. Rules before Practices because knowing what NOT to do is more critical than knowing what to do. Patterns last because they're descriptive — match them during generation, don't front-load them during reading.

If time is tight (e.g., one-shot task), read at minimum: `_glossary.md` → `_index.md` (quickref + one-liners) → `_standards.md` § Rules.

## Workflow: /wiki:make

1. Detect tech stack from config files (Makefile, CMakeLists.txt, Cargo.toml, package.json, etc.).
2. Read existing docs (README, CONTEXT, AGENTS.md) — link from `_index.md`, don't duplicate content.
3. **Domain detection**: scan imports + directory clusters → propose groupings (2–20 files per domain) → **ask user to approve**.
4. **Standards detection**: detect rules (scan for assertions, panic macros, guard patterns, explicit rules in AGENTS.md/CONTEXT), detect patterns (error handling, naming, module structure conventions), load practices from stack defaults (see REFERENCE.md). Present all three as a single `_standards.md` proposal → **ask user to approve**.
5. Ask scope (source files matching language, exclude tests/generated/build artifacts).
6. Create `docs/wiki/`:
   - `_index.md` — quickref + architecture topology + "change X → look at Y"
   - `_standards.md` — `## Rules` + `## Practices` + `## Patterns`
   - `README.md` — agent decision tree + human reading guide
   - `features/*.md` — one per domain, each with architecture + key functions table + testing strategy
   - `_glossary.md` — project-specific terms and definitions (detect from codebase comments, README, domain names; ask user to approve)
   - `plans/` — empty directory
7. Add `## Codebase Wiki` section to AGENTS.md.

## Workflow: /wiki:sync

Use when the wiki skill itself has been updated — new templates, new heuristics, new patterns to detect. The project's domain assignments and approved standards are preserved; only the wiki's format and detection depth are upgraded.

1. Read the current wiki to extract preserved state: domain names, approved `_standards.md` content.
2. Re-detect tech stack with current heuristics.
3. Re-scan patterns with current detection heuristics (REFERENCE.md) — propose additions to `_standards.md` Patterns section, **ask user to approve**.
4. Regenerate `_index.md` — new template format, same domain registry, updated topology.
5. **Diff-based merge**: For each file to rewrite, generate `<file>.new` and `diff <old> <new>`. Present diffs for approval. If changes are rejected, keep the original. If partially accepted, apply only the approved hunks. This preserves human edits.
6. Regenerate `features/*.md` — each domain doc rewritten with current module doc template. Same diff-based merge protocol: generate as `.new`, diff, present for approval.
7. Update `README.md` if the template changed.
8. Update `_glossary.md` if the glossary template changed (same diff-based merge).
9. Report what was upgraded.
10. Run `/wiki:check` automatically to verify consistency after changes.

## Workflow: /wiki:update

Use when project source code has changed and the wiki needs to reflect it — new files, moved files, new domains, architecture shifts.

1. Scan for new source files not covered by any existing `features/*.md`.
2. Scan for files that moved to a different domain.
3. Check if any existing domain docs reference deleted files.
4. **Transitive impact analysis**: For each changed file, trace its import graph to find downstream consumers. E.g., a utility module change affects all domains that import it. Flag affected domains for review even if their own files didn't change. See REFERENCE.md for language-specific tracing techniques.
5. **If new domains found**: propose new domain groupings → **ask user to approve**.
6. Update affected domain docs: architecture changes, new key functions, new edge cases. Also update any domain docs flagged by transitive impact analysis.
7. Regenerate `_index.md` — updated domain registry, topology, file counts.
8. Re-scan patterns — propose additions to `_standards.md` Patterns if new conventions emerged → **ask user to approve**.
9. Report what changed.
10. Run `/wiki:check` automatically to verify consistency after changes.

## Workflow: /wiki:check

Run this anytime to verify wiki consistency — especially before committing wiki changes.

1. **Cross-reference check**: Verify every link in `_index.md` → `features/*.md` resolves to an existing file. Flag dead links.
2. **Domain registry check**: Verify every domain in the registry has a corresponding `features/<domain>.md` file, and vice-versa. Flag orphaned or missing docs.
3. **Standards reference check**: Verify every `<file>:<line>` reference in `_standards.md` §Rules and §Patterns points to an existing file. Flag stale references.
4. **Topology check**: Verify every file mentioned in the topology diagram exists on disk.
5. **Glossary check**: Verify every term in `_glossary.md` is used somewhere in the wiki or source (optional, advisory).
6. **Report**: Print a summary of what passed and what failed. If failures found, recommend fixes. If everything passes, report "wiki is consistent."

## Preventing wiki drift

After running `/wiki:make`, consider installing the post-commit hook:

```bash
# Install the stale-wiki reminder hook
# See install-wiki-hooks/SKILL.md for details
```

This catches the write-and-forget problem automatically.

The hook warns when source changes land without wiki updates. After wiki changes, run `/wiki:check` to catch stale cross-references before they land in a PR.

Run `/wiki:check` after any `/wiki:make`, `/wiki:sync`, or `/wiki:update` to verify internal consistency before committing.

## Proactive suggestion

After making code changes, if `docs/wiki/` exists: "N files changed. Run /wiki:update to refresh domain docs?"

After the wiki skill itself is updated: "The wiki skill has changed. Run /wiki:sync to upgrade your wiki's format and detection depth?"
