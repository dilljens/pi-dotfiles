# pi-dotfiles

Personal [pi coding agent](https://github.com/earendil-works/pi-mono) setup — agents, extensions, skills, and configuration in one place.

## What's inside

```
pi-dotfiles/
├── bootstrap.sh                  # One-command setup on a fresh machine
├── settings.json                 → ~/.pi/agent/settings.json
│
├── agents/                       → ~/.pi/agent/agents/ (symlinked)
│   ├── agent-maker.md            # Creates and modifies agents
│   ├── pi-builder.md             # Builds extensions, skills, packages
│   └── plan.md                   # Read-only planning specialist
│
├── extensions/                   → ~/.pi/agent/extensions/ (symlinked)
│   ├── custom-footer.ts          # TUI footer with agent name + model
│   ├── git-checkpoint.ts         # Auto-stash on each turn
│   ├── interactive-shell.ts      # Interactive bash (! prefix)
│   ├── permission-gate.ts        # Confirm before dangerous commands
│   ├── plan-mode/                # Read-only plan+execute workflow
│   └── skills.ts                 # /skills browser UI
│
├── pi-agent-mode/                → npm/node_modules/ (symlinked, editable)
│   ├── index.ts                  # /agent command, set_agent tool, footer
│   └── package.json
│
└── skills/                       → ~/.pi/agent/skills/custom/ (symlinked)
    ├── engineering/
    │   ├── diagnose                  # Bug diagnosis loop
    │   ├── grill-with-docs           # Plan stress-test against docs
    │   ├── improve-codebase-architecture  # Find deepening opportunities
    │   ├── maintain-wiki             # Codebase wiki for AI navigation
    │   ├── prototype                 # Throwaway prototypes
    │   ├── review                    # Code review (standards + spec)
    │   ├── setup-matt-pocock-skills  # Issue trackers, triage
    │   ├── tdd                       # Red-green-refactor loop
    │   ├── triage                    # Issue triage state machine
    │   └── zoom-out                  # (skill placeholder)
    ├── skills-command/           # /skills command UI
    └── yeet/                     # git add + commit + push
```

## Fresh setup

```bash
# 1. Install pi
curl -fsSL https://pi.dev/install.sh | bash

# 2. Clone this repo
git clone https://github.com/dilljens/pi-dotfiles
cd pi-dotfiles

# 3. Run bootstrap
./bootstrap.sh

# 4. Start pi
pi
```

The bootstrap script symlinks everything into `~/.pi/agent/` so edits in the repo are live immediately.

## Making changes

Since agents, extensions, and skills are symlinked, editing them in the repo is live:

```bash
vi agents/agent-maker.md      # improve agent-maker
vi extensions/skills.ts       # tweak skills browser
vi pi-agent-mode/index.ts     # edit footer / agent switching
```

Commit and push:

```bash
git add -A
git commit -m "whatever"
git push
```

On a fresh machine, clone and run `./bootstrap.sh` to pull everything back.
