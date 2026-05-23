# Maintain Wiki — Reference

## `_index.md` template

Two sections: quick reference at top, full architecture below.

```markdown
# <Project Name> — Architecture Overview

**Build**: `<cmd>`  **Test**: `<cmd>` (<N> tests)  **Setup**: `<cmd>`

## Quick reference

### Key files
| Purpose | File |
|---------|------|
| Program entry | `<file>:<line>` |
| <purpose> | `<file>` |

### Test per domain
| Domain | Run |
|--------|-----|
| <Domain> | `<cmd> <filter>` |

### Domain one-liners
| Domain | Doc |
|--------|-----|
| <Domain> | `features/<domain>.md` — <1 line> |

## Navigation

### For humans
| I want to... | Read |
|-------------|------|
| Know what NOT to do | `_standards.md` § Rules |
| Know how to write new code | `_standards.md` § Practices |
| Match existing conventions | `_standards.md` § Patterns |
| Understand a module | `features/<domain>.md` |

### For AI agents
| Task | Start here |
|------|------------|
| **Cold start (zero context)** | `_glossary.md` → `_index.md` → `_standards.md` § Rules → § Practices → target `features/<domain>.md` → § Patterns |
| Add a feature | `_standards.md` § Rules → § Practices → target `features/<domain>.md` → § Patterns |
| Fix a bug | `features/<domain>.md` (edge cases) → `_standards.md` § Rules |
| Refactor a module | `features/<domain>.md` (deps + consumers) → `_standards.md` § Patterns |
| Navigate unfamiliar code | Read domain one-liner → open `features/<domain>.md` |
| Write a test | `features/<domain>.md` → `_standards.md` § Practices (Testing) |

## Entry points
| Trigger | File | Description |
|----------|------|-------------|

## Topology
```
<dir>/         (<pattern>)
  ├── <file> ──▶ <dep1> ──▶ <dep2>
```

## "Need to change X? Start here"
| Change | Look at |
|--------|---------|

## Domain registry
| Domain | Doc | Files | Purpose |
|--------|-----|-------|---------|

## Existing docs
- [README.md](../../README.md) — project overview, setup
```

Quick reference generated from: build scripts, test runner, domain descriptions.

---

## `_standards.md` template

Three sections: Rules (DON'T — catastrophic), Practices (SHOULD — aspirational), Patterns (TYPICALLY — descriptive).

```markdown
# Coding Standards

## Rules — What you must NEVER do

Breaking these causes bugs hard to find.

| # | Rule | Why | Check |
|---|------|-----|-------|
| 1 | Never <action> | <what breaks> | <how to verify> |

## Practices — How to write NEW code

Standards for code you add or refactor. Existing code may not comply.

### Function design
- Single responsibility. Small (<30 lines). Name for intent.

### State management
- Limit globals. Pass state as params. Make side effects visible.

### Error handling
- Never discard errors. Propagate with context.

### Code clarity
- Comments explain WHY not WHAT. Delete dead code. No magic numbers.

### Naming
- Reveal intent at call site. Booleans: `is*`, `has*`, `can*`.

### Testing
- New behavior → new test. Tests with tests, not `#ifdef UNIT_TEST`.

## Patterns — How code IS written

Detected conventions. Match these so new code fits in.

### Error handling
**Pattern**: <describe>  **Example**: `<file>:<line>`
**Rule**: <constraint>

### Module structure
**Import style**:
**Barrel / re-export pattern**:
**One export per file**: yes / no

### Type conventions
| Kind | Convention | Example |
|------|-----------|---------|
| Result types | | |
| Enums | | |
| Interfaces / traits | | |

### Naming
| Kind | Style | Example |
|------|-------|---------|
| Files | <style> | `<example>` |
| Functions | <style> | `<example>()` |

### Concurrency (if applicable)
**Pattern**: <describe>  **Example**: `<file>:<line>`
```

### Stack-specific practice defaults

Only include the stack(s) detected in this project. Below are the available defaults — pick matching ones:

**C/C++ embedded**: zero-init, no heap, enum class, fixed-width ints, no recursion, always brace, document shared variables, const everything.

**Python**: type hints on public fns, dataclasses for data, pathlib not strings, pytest over unittest.

**TypeScript/React**: explicit Props type, extract hooks from components, derive state don't duplicate, one export per file.

**Rust**: thiserror/anyhow, never .unwrap() in lib code, borrow before move, derive Debug/Clone/PartialEq by default.

**Go**: wrap errors with context (%w), short names in small scope, package name is part of API.

### Rule detection heuristics

Scan for `assert`, `BR_PANIC`, `if (x == nullptr) return`, `while(1)`, guard flags. These tell what author considered catastrophic.

Also scan AGENTS.md, CONTEXT.md, README for explicit rules.

### Pattern detection heuristics

| Category | Detect |
|----------|--------|
| Error handling | throw vs return; `Result`, `Either`, `{data, error}` patterns; error code enums; panic macros |
| Pain points / danger zones | `// @ts-ignore`, `eslint-disable`, `#[allow(...)]`, `# noqa`; `@deprecated`/`#[deprecated]` annotations; `TODO`/`FIXME`/`HACK`/`XXX` comment density per domain |
| Module structure | barrel files (index.ts/__init__.py/mod.rs), named vs default exports, circular dependencies |
| Type conventions | ADT/enum usage, Option/Maybe patterns, discriminated unions, newtype wrappers, interface composition |
| Type safety | branded/newtype wrappers (`type Email = string & { __brand: 'Email' }`), smart constructors, `unsafe` blocks (Rust), null-safety density |
| Async/concurrency | async/await, callbacks, event loops, state-machine switch/case, channels/actors, mutex patterns |
| State management | hooks, stores, globals, actors, context objects |
| Naming | Sample 20+ names per layer, detect dominant style |
| Test patterns | mock approach, fixture setup, test file naming convention |

---

## Module doc template

```markdown
# <Domain>

**Source**: `<files>`  **Updated**: `YYYY-MM-DD`  (N files)

## What it does
2-4 sentences.

## Architecture
ASCII flow diagram.

## Key functions / components
| Name | Kind | File:Line | Purpose |
|------|------|-----------|---------|
| `<fn>()` | function | `<file>:<line>` | <1 line> |
| `<class>` | class | `<file>:<line>` | <1 line> |

## Data flow
Numbered steps.

## Edge cases & gotchas

## Testing strategy
| Aspect | Approach |
|--------|----------|
| Unit tests | <how isolated logic is tested> |
| Integration tests | <how domain boundaries are tested> |
| Key fixtures / mocks | <critical test infrastructure> |
| Run command | `<cmd> <filter>` |

## Dependencies
| Depends on | For |

## Consumed by
| Consumer | How |

## Related domains
| Domain | Doc | Relationship |
```

### Stack-specific sections

| Stack | Add |
|-------|-----|
| React/Next.js | Components, Hooks |
| Python API | Endpoints |
| Go | Commands/Handlers |
| Rust | Types/Traits |
| C/C++ embedded | Globals, Macros, PIO Programs, Protocol, Pin Map |

---

## `_glossary.md` template

```markdown
# Glossary

Project-specific terms and acronyms.

| Term | Definition | Context |
|------|------------|---------|
| <term> | <1-2 sentence definition> | <where it appears> |
```

Detect terms from: domain names, codebase comments mentioning acronyms, README, CONTEXT.md, AGENTS.md, variable/type names with project-specific jargon. **Ask user to approve** the glossary after initial detection and on `/wiki:sync` when new terms emerge.

---

## Domain detection

1. **Directory clusters** — strongest signal
2. **Import communities** — files importing each other heavily
3. **Co-location** — similar names in same dir
4. **Barrel exports** — same index.ts/__init__.py/mod.rs
5. **Config-defined** — monorepo packages

2–20 files per domain.

---

## Transitive dependency detection (for `/wiki:sync`)

When a file changes, its impact may ripple through import chains. Use this to find affected domains beyond the file's own domain.

| Language | Technique |
|----------|-----------|
| TypeScript/JS | `import`/`require` statements → trace to consumers via reverse import search |
| Python | `import` statements → reverse import search in all `.py` files |
| Rust | `use` declarations + `mod` declarations → trace consumers |
| C/C++ | `#include` directives → trace consumers |
| Go | `import` statements → trace consumers |

**Process**: For each changed file:
1. Find which files import it (reverse dependency).
2. Map those files to their domains.
3. Flag any domain not already flagged by direct file-change analysis.
4. Include those domains in the update scope with a note: "Affected transitively via <changed file>."

---

## File scope defaults

| Stack | Include | Exclude |
|-------|---------|---------|
| TS/JS | `src/**/*.{ts,tsx,js,jsx}` | `*.test.*`, `__tests__`, `*.d.ts`, `*.stories.*` |
| Python | `**/*.py` | `test_*.py`, `tests/`, `conftest.py` |
| Go | `**/*.go` | `*_test.go` |
| Rust | `src/**/*.rs` | — |
| C/C++ | `src/**/*.{cpp,h,hpp,c}` | `*test*`, `build/`, `*.pio.h` |

Exclude `node_modules/`, `.git/`, `__pycache__/`, `.venv/`.

---

## README.md template

```markdown
# Codebase Wiki

AI-optimized codebase map.

## For humans
1. `_index.md` — quick reference + architecture (keep open)
2. `_standards.md` § Rules — what never to do
3. `_standards.md` § Practices — how to write new code
4. `features/<domain>.md` — module deep dive

## For AI agents

### Cold start (zero context)
1. `_glossary.md` — learn project vocabulary
2. `_index.md` — architecture topology + domain one-liners
3. `_standards.md` § Rules — what never to do
4. `_standards.md` § Practices — how to write new code
5. `features/<domain>.md` — the domain you're working on
6. `_standards.md` § Patterns — match conventions during generation

### Task-specific

### Adding a feature
_index (Navigation) → _standards (Rules + Practices) → domain doc → _standards (Patterns)

### Debugging
_index (Navigation) → domain doc (edge cases) → _standards (Rules)

### Refactoring
domain docs (deps + consumers) → _index (topology) → _standards (Patterns)

### Unfamiliar code
_index (domain one-liners) → domain doc

### Writing a test
domain doc → _standards (Practices: Testing + Patterns: Test patterns)

## Commands
- `/wiki:make` — initialize wiki (interactive)
- `/wiki:onboard` — cold-start walkthrough
- `/wiki:update` — refresh after code changes
- `/wiki:sync` — upgrade wiki after skill changes
- `/wiki:check` — verify internal consistency

## Preventing drift
Install the [post-commit hook](../wiki/install-wiki-hooks/SKILL.md) to get reminded when source changes land without wiki updates. Run `/wiki:check` before PRs.

## Stale docs
Read source. If doc is wrong, propose update. Don't silently ignore.

## Plans
`docs/wiki/plans/` — architecture proposals and migration plans. Justify decisions (not living docs).
```

---

## Edge cases

**New project**: `/wiki:make` builds from scratch. Links existing README.

**Existing docs/**: Detected, linked from `_index.md`, excluded from wiki scope.

**Large refactor**: Re-run `/wiki:make` if domain structure changed.

**Monorepo**: Detect workspace configs. Each member gets `docs/wiki/<member>/`.
