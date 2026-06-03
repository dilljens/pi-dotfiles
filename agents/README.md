# Agent Workflow: Planner ↔ Executor (with Planner-as-Reviewer)

This directory defines the agent files for a **Planner → Executor → Planner (review)** workflow using [pi-agent-mode](https://github.com/nicekate/pi-agent-mode).

## Overview

```
You present a task
       │
       ▼
  ┌──────────────────────┐
  │  Planner              │  ← auto-activated (defaultAgent)
  │  v4-flash · high      │
  │  reads code, plans    │
  └────────┬─────────────┘
           │ [A] Execute
           │ 1. write .pi/last-plan.md
           │ 2. set_agent → executor
           ▼
  ┌──────────────────────┐
  │  Executor             │  ← reads plan file
  │  v4-flash · off       │
  │  inherits no AGENTS.md│
  │  implements, verifies │
  └────────┬─────────────┘
           │
     ┌─────┴──────┐
     │            │
  small change   │ >200 lines, >5 files,
     │            │ security/migrations
     │            │
     ▼            ▼
   done       set_agent → planner
  (delete      │
   plan)       ▼
        ┌──────────────────────┐
        │  Planner (review)    │  ← inspects diff vs plan
        │  approves or sends   │
        │  back for fixes      │
        └──────────────────────┘
               │ (max 3 rounds)
```

## Files

| File | Role |
|---|---|
| `planner.md` | Planner agent — creates plans, reviews implementation |
| `executor.md` | Executor agent — implements plans, routes back for review |
| `planner.md` (also serves as reviewer) | When called back after execution |

The global `~/.pi/agent/AGENTS.md` contains shared context (tools, wiki discipline, core rules). It's loaded at session start and included in the planner's system prompt. The executor strips it.

## Modes

Sessions start in **base mode** — default pi, no agent active. Quick edits and
simple questions happen here with no overhead.

Use `/plan` to toggle into **plan mode** — activates the planner agent for
structured planning. The planner can hand off to the executor, and the executor
routes back for review on large changes. Use `/plan` again or `/agent clear`
to return to base mode.

## How It Works

### pi-agent-mode

The [pi-agent-mode](https://github.com/nicekate/pi-agent-mode) extension provides:

- **`set_agent` tool** — agents can switch the active agent programmatically
- **`before_agent_start` hook** — injects the active agent's `.md` body into the system prompt each turn
- **`/plan` command** — toggles between base mode and the planner agent

### Custom Modifications

The installed `pi-agent-mode` includes these local modifications:

1. **Per-agent `thinking` frontmatter** — agents can specify `thinking: high` or `thinking: off`. On switch, calls `pi.setThinkingLevel()` to match.

2. **Per-agent `inheritProjectContext` frontmatter** — when `false`, the `before_agent_start` handler strips the `<project_context>` block from the system prompt, removing all AGENTS.md/CLAUDE.md context (global + project). The executor uses this.

3. **Original thinking level restoration** — on `/agent clear`, the original thinking level is restored along with the original model.

### Agent Files vs AGENTS.md

Agent `.md` files and the global `AGENTS.md` serve different purposes:

| File | Used By | Injected How |
|---|---|---|
| `planner.md` body | Planner turns | Prepended to system prompt via `before_agent_start` |
| `executor.md` body | Executor turns | Prepended to system prompt via `before_agent_start` |
| `~/.pi/agent/AGENTS.md` | Planner only (executor strips it) | Loaded as project context at session start |

### Context Per Agent

**Planner sees:**
- planner.md body ("You are a PLANER...")
- Global AGENTS.md (shared context)
- Any project AGENTS.md/CLAUDE.md from parent directories
- Default pi system prompt
- Conversation history

**Executor sees:**
- executor.md body ("You are an EXECUTOR...")
- Default pi system prompt
- Conversation history (including the plan)
- **No AGENTS.md** — global or project-specific

### Plan File Persistence

When the planner's `[A] Execute` is chosen, the plan is written to `.pi/last-plan.md` before switching to the executor. This file:

- Survives session compaction
- Is the authoritative source for the executor
- Gets deleted on completion (small change — executor deletes it) or when the planner approves a review

## Day-to-Day Usage

### Normal flow

1. Start a session → automatically in **Planner** mode
2. Describe your task → Planner reads context and produces a plan
3. Review the plan, pick `[A] Execute`
4. Planner writes `.pi/last-plan.md` and switches to **Executor**
5. Executor implements, verifies
6. If small change → done
7. If large change → Executor switches back to **Planner** for review
8. Planner reviews, approves or sends back for fixes (max 3 rounds)

### Bypassing planning (one-shot tasks)

For trivial tasks, manually switch to executor:

```
/agent executor fix the typo in readme.md
```

### Manual agent switching

```
/agent planner     # switch to planner
/agent executor    # switch to executor
/agent clear       # restore defaults (no agent)
```

## Requirements

- pi-agent-mode installed (`npm:pi-agent-mode` in settings.json packages)
- `defaultAgent: "planner"` in settings.json
- The agent `.md` files in the agent directory (`getAgentDir()/agents/`)
- pi-subagents (optional — only if using subagent tool)

## Files Locations

| File | Location |
|---|---|
| planner.md | symlink → `pi-dotfiles/agents/planner.md` |
| executor.md | symlink → `pi-dotfiles/agents/executor.md` |

Agent files are symlinked from `pi-dotfiles/agents/` into `~/.pi/agent/agents/` for version control.
