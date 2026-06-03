# Agent Workflow: Planner ↔ Executor

Defines agents for pi-agent-mode: planner, executor, task-runner.

## Flow

```
You present a task
       │
       ▼
  ┌──────────┐      ┌──────────────────────┐
  │  Base    │      │  Planner              │
  │  (no     │──→   │  reads code,          │
  │  agent)  │      │  produces plan        │
  └──────────┘      └────────┬─────────────┘
                             │ [A] Execute
                             │ 1. write .pi/last-plan.md
                             │ 2. set_agent → executor
                             ▼
                    ┌──────────────────────┐
                    │  Executor             │
                    │  implements, verifies │
                    │  hands back to        │
                    │  planner when done    │
                    └────────┬─────────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │  Planner (review)    │
                    │  inspects diff       │
                    │  approves or sends   │
                    │  back for fixes      │
                    └──────────────────────┘
                           │ (max 3 rounds)
```

## Usage

Sessions start in **base mode** — no agent, just the global AGENTS.md context. For simple tasks, just work directly.

**Structured planning** (complex tasks):
```
/agent planner
Describe the task...
[A] Execute → executor implements
```

**One-shot implementation** (straightforward):
```
/agent executor add error handling to that function
```

**Other agents:**
```
/agent task-runner    # background long-running processes
/agent clear          # back to base mode
```

## How it works

- pi-agent-mode provides `/agent`, `set_agent`, `/agents`, `/agent-search`
- Agent `.md` files are symlinked from pi-dotfiles into `~/.pi/agent/agents/`
- Planner sees AGENTS.md context. Executor strips it (clean context for implementation).
- Plan file `.pi/last-plan.md` persists across compaction for the executor.
