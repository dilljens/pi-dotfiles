#!/usr/bin/env bash
set -euo pipefail
# Git post-commit hook: suggest `update wiki` when source files change but wiki docs don't.
# Install: see SKILL.md in this directory

# Skip if no parent commit (first commit or orphan branch)
if ! git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  exit 0
fi

# Get list of files changed in this commit vs its parent
CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)

if [ -z "$CHANGED" ]; then
  exit 0
fi

SOURCE_CHANGED=false
WIKI_CHANGED=false

for FILE in $CHANGED; do
  case "$FILE" in
    docs/wiki/*)
      WIKI_CHANGED=true
      continue
      ;;
    package-lock.json | pnpm-lock.yaml | yarn.lock | Cargo.lock | Gemfile.lock | go.sum | composer.lock)
      continue
      ;;
    *.md | *.txt | *.rst)
      continue
      ;;
    .gitignore | .gitattributes | .editorconfig | .prettierrc*)
      continue
      ;;
    LICENSE*)
      continue
      ;;
  esac

  SOURCE_CHANGED=true
  break
done

if [ "$SOURCE_CHANGED" = true ] && [ "$WIKI_CHANGED" = false ]; then
  echo ""
  echo "💡 Source files changed but docs/wiki/ wasn't updated."
  echo "   Consider running: update wiki"
  echo "   (or 'refresh wiki' if the maintain-wiki skill has changed)"
  echo ""
fi

exit 0
