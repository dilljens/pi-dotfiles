---
name: install-wiki-hooks
description: Install a git post-commit hook that suggests `/wiki:update` when source files change but wiki docs aren't updated. Use after `/wiki:make` or when adding the wiki to a project. Prevents wiki drift.
---

# Install Wiki Hooks

Bundled resource for the [wiki](../SKILL.md) skill. Installs a `post-commit` hook that detects stale wiki docs.

## What it does

After every commit, the hook checks:
- Did this commit change source files (code, config, etc.)?
- Did it **not** change any files in `docs/wiki/`?

If both are true, it prints a reminder: **"Consider running: /wiki:update"

It stays silent for:
- Wiki-only changes
- Docs / markdown / lockfile-only changes
- First commits / orphan branches

## Install into a project

```bash
# From the project root:
cp {baseDir}/post-commit-hook.sh .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

Or if the project has an existing hook installer:

```bash
# Add to scripts/ and symlink from install-hooks.sh:
cp {baseDir}/post-commit-hook.sh scripts/post-commit-hook.sh
chmod +x scripts/post-commit-hook.sh
ln -sf "../../scripts/post-commit-hook.sh" .git/hooks/post-commit
```

## Remove

```bash
rm .git/hooks/post-commit
```
