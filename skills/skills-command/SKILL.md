---
name: skills-command
description: Display all available skills in an organized, categorized format when the user types /skills or asks to list/view/show skills. Triggers on "/skills", "list skills", "show skills", "what skills", "view all skills", "available skills", "skill list".
---

# /skills — List all installed skills

When the user types `/skills` or asks to see available skills, scan all skill directories and display them organized by source. Do not display loaded/active skill context — instead show the full catalog installed on disk.

## How to scan

Walk these directories, each representing a skill family:

| Source | Path |
|--------|------|
| **Anthropic** | `~/.pi/agent/skills/anthropic-skills/skills/*/SKILL.md` |
| **Custom** | `~/.pi/agent/skills/custom-skills/skills/*/SKILL.md` and `~/.pi/agent/skills/custom-skills/skills/*/*/SKILL.md` (one level deep) |
| **Pi** | `~/.pi/agent/skills/pi-skills/*/SKILL.md` |
| **Firecrawl** | `~/.pi/agent/skills/firecrawl-*/SKILL.md` (symlinks) |

For each `SKILL.md` found, extract the `name` and `description` from the YAML frontmatter (between `---` markers). For skills without YAML frontmatter (e.g., the firecrawl symlinks), fall back to the directory name and a short blurb.

## Display format

Organize under a clear header with skills grouped by source family. Use a compact table or bullet list per group. Show `name` (or directory name) as a **bold** identifier and the `description` as its explanation.

```
## Available skills

### Anthropic (17)
| Skill | Description |
|-------|-------------|
| **algorithmic-art** | Creating algorithmic art using p5.js ... |

### Custom / Engineering (11)
| Skill | Description |
|-------|-------------|
| **diagnose** | Disciplined diagnosis loop for hard bugs ... |

...

Total: <N> skills
```

Sub-group custom skills by their subdirectory (e.g., `engineering`, `in-progress`, or top-level) with indented sub-headers.

When displaying, sort skills alphabetically within each group. Keep descriptions concise — trim to the first sentence or ~100 chars if longer.

At the end, show the total count across all families.

## When to trigger

Trigger on any of these user messages (case-insensitive):
- `/skills`
- "list skills", "show skills", "what skills do you have"
- "view all skills", "available skills", "skill list"
- "what can you do" — when the context suggests they're asking about pi's skill catalog, not generic capabilities

Do not trigger for:
- `/skills` followed by arguments (e.g., `/skills edit`) — that's an unimplemented subcommand, say so
- "what can you do" in a general sense — only if the topic is specifically about installed skills
