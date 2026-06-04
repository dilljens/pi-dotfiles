---
name: pi-dotfiles
description: Maintain pi-dotfiles repo — detect settings drift, keep AGENTS.md in sync, validate install.sh covers everything, and ensure commits are complete. Use when asked about updating dotfiles, checking config drift, or making sure pi-dotfiles can reproduce the setup on a fresh machine.
---

# pi-dotfiles Maintenance

Keep the [pi-dotfiles](https://github.com/dilljens/pi-dotfiles) repo healthy and capable of reproducing your full pi setup on a fresh machine.

## Vocabulary

- **Repo** — `$PI_DOTFILES` (default `~/pi-dotfiles`)
- **Live** — `~/.pi/agent/`
- **Drift** — a difference between Live and Repo that would make a fresh install incomplete

## Commands

### `/pi-dotfiles check` — Detect drift

Compare every critical file between Live and Repo:

| Check | What it looks for |
|-------|-------------------|
| `AGENTS.md` | Exists in repo, matches live content |
| `settings.json` | Extensions array matches, packages match, skills match |
| `npm/package.json` | Dependencies match live `~/.pi/agent/npm/package.json` |
| `install.sh` | Covers all files in the repo (AGENTS.md, keybindings, models, npm, extensions, skills, agents) |
| `auth.json` | Not committed (in `.gitignore`) |

Report each check as ✓, ❌, or ⚠️ (warn). For ❌ items, show the diff.

### `/pi-dotfiles sync` — Fix drift

Copy live state into the repo files:

1. **Settings extensions**: Read `live.extensions`, normalize paths to `$PI_DOTFILES/...`, write to `settings.json`
2. **Settings packages**: Merge live packages list into repo settings.json
3. **npm deps**: Copy `live.npm/package.json` → `repo.npm/package.json`
4. **AGENTS.md**: Copy live AGENTS.md → repo AGENTS.md (if live changed)
5. **install.sh**: Verify file reference coverage (auto-fix if struct is simple)

Ask before overwriting files that have uncommitted changes.

### `/pi-dotfiles validate` — Full reproducibility check

Run `check`, plus:

- Check that every file in `repo/settings.json` `extensions` array exists on disk
- Check that every file in `repo/settings.json` `skills` array exists on disk
- Verify `install.sh` `sed` substitution covers all path patterns (`/home/dillon/pi-dotfiles`)
- Verify no tracked files reference absolute paths that won't be substituted
- Check `.gitignore` covers auth files, node_modules, and pi artifacts

### `/pi-dotfiles commit` — Pre-commit guard

Before committing, runs `validate`. If anything is ❌, refuse and show what needs fixing. Provide the exact `sync` command to fix it.

## Patterns

### Reading live settings

```bash
# Live settings
python3 -c "import json; print(json.dumps(json.load(open('$HOME/.pi/agent/settings.json'))['extensions'], indent=2))"

# Repo settings
python3 -c "import json; print(json.dumps(json.load(open('$PI_DOTFILES/settings.json'))['extensions'], indent=2))"
```

### Normalizing paths

Repo paths in settings use `/home/dillon/pi-dotfiles/...` as literal prefix.
The `install.sh` substitutes this with the actual clone location via `sed`.
When syncing, convert `~/.pi/agent/` paths back to repo paths:

```python
path.replace('/home/dillon/.pi/agent/', '/home/dillon/pi-dotfiles/')
```

But for `settings.json`, the live paths already point to the repo directory (since files are symlinked), so just use them as-is.

### Checking file existence

```bash
# Verify every extension file in settings exists
python3 -c "
import json, sys, os
s = json.load(open('$PI_DOTFILES/settings.json'))
for ext in s.get('extensions', []):
    if not os.path.exists(ext):
        print(f'MISSING: {ext}')
"
```

## Guardrails

- Do NOT commit `auth.json` or any credential files
- Do NOT modify `~/.pi/agent/` during validation — only read
- Do NOT rename/delete files without user confirmation
- The `npm/node_modules/` dir is gitignored — never track it
