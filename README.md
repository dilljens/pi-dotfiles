# pi-dotfiles

Personal [pi coding agent](https://github.com/earendil-works/pi-mono) setup — profiles, skills, extensions, and agents.

## Profiles

| Profile | Model | Thinking | Role |
|---------|-------|----------|------|
| `bare` | deepseek-v4-pro | high | Planner — interactive planning loop |
| `main` | deepseek-v4-flash | minimal | Executor — direct implementation |

## Fresh setup

```bash
# 1. Install pi
curl -fsSL https://pi.dev/install.sh | bash

# 2. Clone this repo
git clone https://github.com/dilljens/pi-dotfiles
cd pi-dotfiles

# 3. Set your DeepSeek API key
export DEEPSEEK_API_KEY="sk-..."

# 4. Install a profile
./profiles/bare/install.sh     # Planner profile
./profiles/main/install.sh     # Executor profile

# 5. Launch
pi --profile bare
pi --profile main
```

Each `install.sh` copies config, symlinks shared assets (extensions, skills, agents), and installs profile-specific npm packages.

## What's inside

```
pi-dotfiles/
├── models.json                  # DeepSeek V4 provider config (shared)
│
├── profiles/
│   ├── bare/                    # Planner — deepseek-v4-pro:high
│   │   ├── install.sh
│   │   ├── settings.json
│   │   ├── keybindings.json
│   │   ├── packages.txt
│   │   └── skills.txt
│   └── main/                    # Executor — deepseek-v4-flash
│       ├── install.sh
│       ├── settings.json
│       ├── keybindings.json
│       ├── packages.txt
│       └── skills.txt
│
├── agents/                      # Shared agent definitions
│   ├── agent-maker.md
│   ├── pi-builder.md
│   └── plan.md
│
├── extensions/                  # Shared file-based extensions
│   ├── plan-mode/
│   ├── skills.ts
│   ├── permission-gate.ts
│   ├── git-checkpoint.ts
│   └── ...
│
├── skills/                      # Shared skill definitions
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

## Adding a new profile

```bash
mkdir -p profiles/my-profile
touch profiles/my-profile/{install.sh,settings.json,packages.txt,skills.txt}
```

Follow the same pattern as `bare/` or `main/`. Shared assets (extensions, skills, agents) are always symlinked — only `packages.txt` and `skills.txt` are profile-specific.

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
