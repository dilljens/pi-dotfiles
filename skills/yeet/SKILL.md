---
name: yeet
description: Stage all changes (`git add .`), write a concise commit message summarizing the changes, commit, and push. One-command "git yeet". Run `/yeet commit` to skip the push.
---

# Yeet

Stage everything, commit with a descriptive message, and push.

## Instructions

1. **Stage all changes**
   ```bash
   git add .
   ```

2. **Review the diff**
   ```bash
   git diff --cached
   ```

3. **Write a concise commit message** based on the diff — one-liner title + bullet summary of key changes. Use conventional commit format (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, etc.).

4. **Commit**
   ```bash
   git commit -m "<message>"
   ```

5. **Push** (only if the user didn't say "commit")
   ```bash
   git push
   ```

If there's nothing to stage, notify the user instead of creating an empty commit.

## Arguments

- No args — full yeet: add, commit, push
- `commit` — add and commit only, no push
