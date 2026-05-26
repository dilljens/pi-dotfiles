# Main Profile — pi-crew Orchestrator

Full-featured profile with pi-crew for multi-agent orchestration and the complete skill set.

## Architecture

Uses pi-crew to spawn and manage multiple agent teams for complex, multi-phase work.

## Model

| Setting | Value |
|---------|-------|
| Provider | opencode-go |
| Model | deepseek-v4-flash |
| Thinking | minimal |
| Context | 1M tokens |

## Extensions (4)

| Extension | Purpose |
|-----------|---------|
| pi-agent-browser-native | Native browser automation |
| pi-agent-mode | Agent switching and footer |
| pi-crew | Multi-agent team orchestration |
| pi-observational-memory | Session memory tracking |

## Skills (8)

| Skill | Purpose |
|-------|---------|
| diagnose | Bug diagnosis loop |
| grill-with-docs | Stress-test plans against domain docs and ADRs |
| improve-codebase-architecture | Find deepening opportunities, refactoring targets |
| maintain-wiki | Create and update docs/wiki/ for AI navigation |
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
