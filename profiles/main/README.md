# Main Profile — pi-crew Orchestrator

Full-featured profile with pi-crew multi-agent orchestration, the complete extension suite, and all skills.

## Architecture

Uses pi-crew to spawn and manage multiple agent teams for complex, multi-phase work.

## Model

| Setting | Value |
|---------|-------|
| Provider | opencode-go |
| Model | deepseek-v4-flash |
| Thinking | minimal |
| Context | 1M tokens |

## Extensions

### npm (4)
| Extension | Purpose |
|-----------|---------|
| pi-crew | Multi-agent team orchestration (`/crew`) |
| pi-agent-browser-native | Native browser automation |
| pi-agent-mode | Agent switching, footer, `/agent` command |
| pi-observational-memory | Session memory tracking |

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

### Separate setup

| Tool | Purpose |
|------|---------|
| agentmemory | Memory server (localhost:3111) — explicit retrieval via `/recall` |

## Skills (8, shared)
| Skill | Purpose |
|-------|---------|
| diagnose | Bug diagnosis loop |
| grill-with-docs | Stress-test plans against domain docs and ADRs |
| improve-codebase-architecture | Find deepening opportunities, refactoring targets |
| maintain-wiki | Create/update docs/wiki/ for AI navigation |
| prototype | Throwaway prototypes for exploration |
| review | Code review against standards and spec |
| tdd | Red-green-refactor loop |
| triage | Issue triage state machine |

## Key commands

```
/crew
/wiki:update
/compact
```
