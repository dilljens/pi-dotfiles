# Main Profile — Executor

Direct implementation profile. No reasoning overhead, aggressive tool usage, minimal diffs.

## Model

| Setting | Value |
|---------|-------|
| Provider | opencode-go |
| Model | deepseek-v4-flash |
| Thinking | minimal |
| Context | 1M tokens |

## Purpose

This is the **Executor** role. Receives an approved plan and implements it directly.

Style rules:
- Minimal diffs — change only what's needed
- Preserve existing APIs and design patterns
- No speculative refactoring
- Follow the plan, don't deviate

## When to use

- After the Planner has an approved [A] Execute plan
- For straightforward one-shot tasks that don't need a plan
- As a subagent spawned by the Planner

## Extensions

| Extension | Purpose |
|-----------|---------|
| pi-agent-browser-native | Native browser automation |
| pi-agent-mode | Agent switching and footer |
| pi-crew | Multi-agent team orchestration |
| pi-observational-memory | Session memory tracking |

## Skills

| Skill | Purpose |
|-------|---------|
| maintain-wiki | Update wiki after code changes |
| improve-codebase-architecture | Find deepening opportunities |
| grill-with-docs | Stress-test plans against docs |

## Key commands

```
/compact
/wiki:update
```
