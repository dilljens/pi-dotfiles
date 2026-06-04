# pi-dotfiles

Personal [pi coding agent](https://github.com/earendil-works/pi-mono) setup — skills, extensions, agents, and config to reproduce the full environment on a fresh machine.

## Fresh setup

```bash
# 1. Install pi
curl -fsSL https://pi.dev/install.sh | bash

# 2. Clone this repo
git clone https://github.com/dilljens/pi-dotfiles
cd pi-dotfiles

# 3. Set your API keys
export COMMANDCODE_API_KEY="cc-..."
export DEEPSEEK_API_KEY="sk-..."

# 4. Install — copies config, symlinks skills/extensions/agents, installs npm deps
./install.sh

# 5. Launch
pi
```

## What's inside

```
pi-dotfiles/
├── AGENTS.md                    # Global pi context (agents, style, rules)
├── install.sh                   # Single installer
├── settings.json                # Pi settings (extensions, skills, packages, models)
├── keybindings.json             # Custom keybindings
├── models.json                  # Provider config (commandcode, deepseek)
│
├── agents/                      # Agent definitions
│   ├── planner.md
│   ├── executor.md
│   └── task-runner.md
│
├── extensions/                  # File-based extensions (symlinked)
│   ├── bookmark.ts
│   ├── dirty-repo-guard.ts
│   ├── footer.ts
│   ├── git-checkpoint.ts
│   ├── herdr-agent-state.ts
│   ├── ocr.ts
│   ├── permission-gate.ts
│   ├── session-name.ts
│   ├── slash-commands.ts
│   ├── sudo-gate.ts
│   ├── summarize.ts
│   ├── wiki.ts
│   └── yeet.ts
│
├── skills/                      # Skill definitions (symlinked)
│   └── engineering/
│       ├── diagnose/
│       ├── grill-with-docs/
│       ├── improve-codebase-architecture/
│       ├── local-agents-md/
│       ├── pi-dotfiles/         # ← Skill for maintaining this repo
│       ├── prototype/
│       ├── review/
│       ├── tdd/
│       ├── triage/
│       └── wiki/
│
├── packages/                    # Editable npm packages (symlinked)
│   └── pi-agent-mode/
│
├── npm/                         # npm dependencies (package.json only)
│   └── package.json
│
└── scripts/
    └── _lib.sh                  # Shared installer helpers
```

## Making changes

Extensions, skills, and agents are symlinked — edits in the repo are live:

```bash
vi skills/engineering/pi-dotfiles/SKILL.md
vi extensions/permission-gate.ts
```

Before committing, run a reproducibility check:

```bash
# Use the built-in skill
/pi-dotfiles check
```

Commit and push:

```bash
git add -A && git commit -m "whatever" && git push
```

## Re-installing

After pulling changes:

```bash
cd pi-dotfiles
./install.sh
```
