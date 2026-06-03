---
name: local-agents-md
description: Generate a project-specific AGENTS.md file. Use when user says "make AGENTS.md", "create project agent file", "initialize AGENTS.md", or asks to set up agent instructions for a project.
---

# Generate Project AGENTS.md

Create a project-specific AGENTS.md file following the open standard (agents.md).

## Workflow

### Phase 1: Detect Stack

Scan the project root for indicators:

| File | Stack |
|------|-------|
| `package.json` | Node.js — check for frameworks (React, Vue, Svelte, Express, Fastify, etc.) |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `requirements.txt` / `pyproject.toml` / `setup.py` | Python |
| `Makefile` / `CMakeLists.txt` | C/C++ |
| `*.nix` / `flake.nix` | Nix |
| `AGENTS.md` already exists | Existing — ask to update or replace |

Extract:
- Language and version constraints
- Framework and key dependencies
- Build system (npm, cargo, go, make, etc.)
- Test framework (jest, vitest, pytest, cargo test, etc.)
- Linter/formatter (eslint, prettier, rustfmt, black, etc.)

### Phase 2: Ask About Conventions

Ask the user about project-specific conventions:

1. **File organization** — flat or nested? src/ or lib/? Where do tests live?
2. **Naming conventions** — camelCase, snake_case, kebab-case for files? For variables?
3. **Import style** — relative or absolute? Barrel exports?
4. **Error handling** — try/catch, Result types, error codes?
5. **Git workflow** — conventional commits? Branch naming?
6. **Special rules** — anything unique to this project?

### Phase 3: Generate AGENTS.md

Write to project root. Follow this structure:

```markdown
# {Project Name}

{One-line description of what this project is}

## Build

{Build commands with brief explanation}

## Testing

{Test commands with brief explanation}

## Conventions

{Project-specific conventions as bullet points}

## Rules

{Rules that apply to this project}
```

### Phase 4: Verify

After writing:
1. Re-read the file
2. Check for accuracy against detected stack
3. Ask user to confirm or adjust

## Output Format

The AGENTS.md should be:
- **Concise** — under 50 lines for most projects
- **Actionable** — commands the agent can actually run
- **Specific** — not generic advice, but this project's reality
- **Scannable** — headers and bullets, not paragraphs

## What NOT to Include

- Agent definitions (that's for Claude Code, not pi)
- Vague instructions ("write good code")
- Things that change per session
- Duplicates of README.md (reference it instead)

## Example Output

For a TypeScript + React + Vite project:

```markdown
# my-app

React + TypeScript SPA with Vite.

## Build

- `pnpm install` — install dependencies
- `pnpm dev` — start dev server on :5173
- `pnpm build` — production build to dist/

## Testing

- `pnpm test` — run vitest
- `pnpm test:ui` — vitest with UI
- `pnpm lint` — eslint + prettier check

## Conventions

- Components in `src/components/` — PascalCase files
- Hooks in `src/hooks/` — camelCase with `use` prefix
- Utils in `src/utils/` — camelCase
- Tests adjacent to source as `*.test.ts`
- No barrel exports — import directly from file

## Rules

- Run `pnpm lint` before committing
- Run `pnpm test` to verify changes don't break existing tests
- Keep components small — split if over 150 lines
- Props interfaces go in the same file, not separate types file
```
