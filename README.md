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
    ├── engineering/              (tdd, diagnose, review, prototype, …)
    ├── personal/                 (obsidian-vault, edit-article)
    ├── productivity/             (write-a-skill, handoff, grill-me, …)
    ├── misc/                     (setup-pre-commit, git-guardrails, …)
    ├── in-progress/              (writing-shape, writing-beats, …)
    └── deprecated/               (qa, design-an-interface, …)
```

## Fresh setup

```bash
# 1. Install pi if you haven't
curl -fsSL https://pi.dev/install.sh | bash

# 2. Clone this repo
git clone https://github.com/dilljens/pi-dotfiles
cd pi-dotfiles

# 3. Run bootstrap
./bootstrap.sh

# 4. Start pi
pi
```

The bootstrap script symlinks everything into `~/.pi/agent/` so edits in the repo are live immediately. Run `/reload` inside pi to pick up changes without restarting.

## Making changes

Since agents and extensions are symlinked, editing them in the repo directory automatically updates the running pi installation:

```bash
vi pi-agent-mode/index.ts   # edit the agent footer
vi agents/agent-maker.md     # improve the agent-maker
vi extensions/skills.ts      # tweak the skills browser
```

Commit and push as usual:

```bash
git add -A
git commit -m "tweak agent footer truncation"
git push
```

## Updating custom skills

The skills are pulled from [dilljens/custom-skills](https://github.com/dilljens/custom-skills). To pull the latest:

```bash
cd pi-dotfiles/skills
git pull https://github.com/dilljens/custom-skills.git main
```

## Credits

- [pi coding agent](https://github.com/earendil-works/pi-mono) — the agent framework
- [pi-agent-mode](https://github.com/mariozechner/pi-agent-mode) — inline agent switching
- [firecrawl skills](https://github.com/nicholasgriffintn/pi-firecrawl-skills) — web research
