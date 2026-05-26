# Bare Profile — Planner + Executor

Two-agent workflow with structured plan output. Planner proposes, Executor implements.

## Architecture

```
┌─────────────────────────────────────────┐
│  Planner (deepseek-v4-pro, thinking:high)
│  ────────────────────────────────────── │
│  • Scans AGENTS.md + wiki + code        │
│  • Outputs Plan template [A][B][C]      │
│  • Never executes — only plans          │
│  • Spawns Executor via /subagent or     │
│    hands off via Ctrl+P model switch    │
└──────────────┬──────────────────────────┘
               │ [A] Execute
┌──────────────▼──────────────────────────┐
│  Executor (deepseek-v4-flash, thinking:minimal)
│  ────────────────────────────────────── │
│  • Implements approved plans            │
│  • Minimal diffs, preserves patterns    │
│  • Runs verifyCommand, max 3 retries    │
│  • Cannot plan or spawn sub-plans       │
└─────────────────────────────────────────┘
```

## Model

| Role | Model | Thinking |
|------|-------|----------|
| Planner | deepseek-v4-pro | high |
| Executor | deepseek-v4-flash | minimal |

## Workflow

1. **Describe task** → Planner scans context, outputs Plan
2. **[B] Refine** → iterate on the plan
3. **[A] Execute** → hand off to Executor
4. **Ctrl+P** → switch to flash model
5. Executor implements, verifies, loops (max 3 retries)
6. **Ctrl+P** → back to Planner for next task

Or automated: `/subagent deepseek-v4-flash "Implement X"`

## Extensions

### npm (6)
| Extension | Purpose |
|-----------|---------|
| pi-subagents | Spawn Executor subagents (`/subagent`) |
| pi-until-done | TDD-first autonomous loop (`/until-done`) |
| pi-lens | LSP/linter feedback after each file edit |
| @gotgenes/pi-permission-system | Destructive command gate |
| pi-web-access | Web search, URL fetch, librarian skill |
| @juicesharp/rpiv-todo | Persistent task list overlay |

### File-based (14, shared)
| Extension | Purpose |
|-----------|---------|
| plan-mode | Read-only planning mode |
| plan-mode-footer | Plan mode TUI footer + shortcut |
| permission-gate | Confirm before dangerous commands |
| ast-grep | AST-based code search |
| auto-name | Auto-name sessions |
| firecrawl | Web scraping |
| footer | TUI footer with agent + model |
| git-checkpoint | Auto-stash each turn |
| herdr-agent-state | Agent state tracking |
| interactive-shell | Interactive bash (`!` prefix) |
| skills | `/skills` browser UI |
| slash-commands | Extended slash commands |
| till-done | Task progress tracker |
| wiki | `/wiki:make`, `/wiki:update`, `/wiki:refresh` |
| yeet | `git add` + `commit` + `push` shortcut |

## Skills (8, shared)
| Skill | Purpose |
|-------|---------|
| maintain-wiki | Create/update docs/wiki/ for AI navigation |
| improve-codebase-architecture | Find deepening opportunities |
| grill-with-docs | Stress-test plans against domain docs and ADRs |
| diagnose | Bug diagnosis loop |
| prototype | Throwaway prototypes |
| review | Code review against standards and spec |
| tdd | Red-green-refactor loop |
| triage | Issue triage state machine |

## Key commands

```
/subagent deepseek-v4-flash "Implement..."
/until-done Refactor auth
/wiki:update
/compact
```
