# pi-dotfiles

Personal [pi coding agent](https://github.com/earendil-works/pi-mono) setup — skills, extensions, and agents.

## Fresh setup

```bash
# 1. Install pi
curl -fsSL https://pi.dev/install.sh | bash

# 2. Clone this repo
git clone https://github.com/dilljens/pi-dotfiles
cd pi-dotfiles

# 3. Set your API key (commandcode, deepseek, etc.)
export DEEPSEEK_API_KEY="sk-..."

# 4. Install
./install.sh

# 5. Launch
pi
```

The `install.sh` copies config, symlinks shared assets (extensions, skills, agents), and installs npm packages.

## What's inside

```
pi-dotfiles/
├── install.sh                   # Single installer
├── settings.json                # Pi settings (models, packages, skills)
├── keybindings.json             # Custom keybindings
├── models.json                  # Provider config (commandcode, deepseek)
│
├── agents/                      # Agent definitions (planner, executor, etc.)
│   ├── planner.md
│   ├── executor.md
│   ├── agent-maker.md
│   ├── pi-builder.md
│   ├── plan.md
│   └── task-runner.md
│
├── extensions/                  # File-based extensions
│   ├── plan-mode/
│   ├── skills.ts
│   ├── permission-gate.ts
│   ├── git-checkpoint.ts
│   └── ...
│
├── skills/                      # Skill definitions
│   └── engineering/
│       ├── maintain-wiki/
│       ├── improve-codebase-architecture/
│       ├── grill-with-docs/
│       ├── diagnose/
│       ├── tdd/
│       └── ...
│
├── packages/                    # Editable npm packages (symlinked)
│   └── pi-agent-mode/
│
└── scripts/
    └── _lib.sh                  # Shared installer helpers
```

## Making changes

Extensions, skills, and agents are symlinked — edits in the repo are live:

```bash
vi skills/engineering/maintain-wiki/SKILL.md
vi extensions/skills.ts
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
