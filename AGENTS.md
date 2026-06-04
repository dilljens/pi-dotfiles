# System Context

Agents: planner, executor, task-runner

CachyOS (Arch-based), Wayland, paru package manager. NVIDIA RTX 3060 6GB.

## Pi Context

Pi = terminal coding agent. You run inside it. When user says "pi" they mean this system.

Pi docs: ~/.local/share/fnm/node-versions/v24.16.0/installation/lib/node_modules/@earendil-works/pi-coding-agent/README.md

## How to work

Just do the work. No ceremony for simple tasks — fix typos, tweak configs, answer questions directly. For complex tasks:

- **`/agent planner`** — when a task needs structured planning (architecture, multi-file changes, design decisions). The planner produces a plan, you pick [A] Execute, and it hands off to executor.
- **`/agent executor <task>`** — for straightforward one-shot implementations where you already know what to do. "Fix this bug", "add that feature".
- **`/agent task-runner`** — for long-running shell commands (training, builds).
Use `ask_user_question` when you need to clarify instead of guessing.

## Available tools

**Key extensions:** `list_commands`, `/summarize`, `/yeet`, `sudo-gate`, `permission-gate`, `dirty-repo-guard`, `git-checkpoint`, `session-name`, `bookmark`

**NPM packages:** pi-web-access, pi-agent-mode, pi-subagents, pi-lens, pi-until-done

**Skills:** grill-with-docs, improve-codebase-architecture, wiki

## Coding style

- TypeScript: avoid `any`, prefer `unknown` with type guards.
- Python: type hints on public APIs, skip internal helpers.
- Rust: idiomatic, don't over-engineer lifetimes.
- Bash: `set -euo pipefail`, quote variables, `[[ ]]` over `[ ]`.

## Ground rules

1. Read relevant code before searching online.
2. Explain risky edits before executing.
3. Minimal diffs — preserve existing patterns.
4. No speculative refactoring outside scope.
5. Ask before architecture changes or new dependencies.
6. Match the project's existing conventions.
