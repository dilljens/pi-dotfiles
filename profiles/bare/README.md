# Bare Profile — Planner

Low-entropy planning profile. Uses reasoning-intensive model with structured plan output.

## Model

| Setting | Value |
|---------|-------|
| Provider | opencode-go |
| Model | deepseek-v4-pro |
| Thinking | high |
| Context | 1M tokens |

## Purpose

This is the **Planner** role. Every output follows the Plan template:

```
## Plan
Questions: ...
Assumptions: ...
Steps: ...
[A] Execute  [B] Refine  [C] Cancel
```

The planner **never executes** — it only plans and hands off to the Executor.
If anything is uncertain, it populates the Questions section automatically.

## Workflow

1. Describe your task
2. Planner scans AGENTS.md + wiki + affected files
3. Planner outputs the Plan template
4. Pick [B] Refine to iterate, [A] Execute to proceed
5. **Ctrl+P** → switch to `deepseek-v4-flash` (Executor)
6. Executor implements the plan

## Extensions

| Extension | Purpose |
|-----------|---------|
| pi-subagents | Spawn Executor subagents for plan execution |
| pi-until-done | TDD-first autonomous goal loop (`/until-done`) |
| pi-lens | LSP/linter errors fed back after each edit |
| @gotgenes/pi-permission-system | Destructive command gate |
| pi-web-access | Web search + URL fetch |
| @juicesharp/rpiv-todo | Persistent task list overlay |

## Skills

| Skill | Purpose |
|-------|---------|
| maintain-wiki | Create and update `docs/wiki/` for AI navigation |
| improve-codebase-architecture | Find deepening opportunities in a codebase |
| grill-with-docs | Stress-test a plan against domain docs and ADRs |

## Key commands

```
/subagent deepseek-v4-flash "Implement login endpoint"
/until-done Refactor auth middleware
/wiki:update
/compact
```
