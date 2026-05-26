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

## Extensions (6)

| Extension | Purpose |
|-----------|---------|
| pi-subagents | Spawn Executor subagents |
| pi-until-done | TDD-first autonomous loop |
| pi-lens | LSP/linter feedback per edit |
| @gotgenes/pi-permission-system | Destructive command gate |
| pi-web-access | Web search + URL fetch |
| @juicesharp/rpiv-todo | Persistent task list |

## Skills (3)

| Skill | Purpose |
|-------|---------|
| maintain-wiki | Create/update docs/wiki/ |
| improve-codebase-architecture | Find deepening opportunities |
| grill-with-docs | Stress-test plans against docs |

## Key commands

```
/subagent deepseek-v4-flash "Implement..."
/until-done Refactor auth
/wiki:update
/compact
```
