#!/usr/bin/env bash
set -euo pipefail
PROFILE="bare"
echo "=== Pi Bare Profile Installer ==="
echo ""

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
source "$REPO/scripts/_lib.sh"

PROFILE_DIR="${HOME}/.pi/agent-profiles/${PROFILE}"
AGENT_DIR="${HOME}/.pi/agent"

# ── 1. Profile directory ────────────────────────────────────────────────
mkdir -p "$PROFILE_DIR"
echo "Profile: $PROFILE_DIR"

# ── 2. Profile config ───────────────────────────────────────────────────
cp "$REPO/profiles/$PROFILE/settings.json" "$PROFILE_DIR/"
echo "  settings.json ✓"
if [ -f "$REPO/profiles/$PROFILE/keybindings.json" ]; then
  cp "$REPO/profiles/$PROFILE/keybindings.json" "$PROFILE_DIR/"
  echo "  keybindings.json ✓"
fi

# ── 3. models.json (global) ─────────────────────────────────────────────
if [ -f "$REPO/models.json" ]; then
  cp "$REPO/models.json" "$AGENT_DIR/models.json"
  echo "  models.json ✓"
fi

# ── 4. Shared symlinks (extensions, skills, agents, packages) ──────────
echo ""
echo "Symlinking shared assets..."
link_extensions
link_skills
link_agents
link_packages

# ── 5. Profile-specific npm packages ────────────────────────────────────
echo ""
echo "Installing npm extensions..."
while IFS= read -r pkg; do
  pkg=$(echo "$pkg" | sed 's/#.*//' | xargs)
  [[ -z "$pkg" ]] && continue
  echo "  $pkg"
  pi install "npm:$pkg" 2>&1 | tail -1
done < "$REPO/profiles/$PROFILE/packages.txt"

# ── 6. Profile-specific skills ──────────────────────────────────────────
echo ""
echo "Linking skills..."
while IFS= read -r skill; do
  skill=$(echo "$skill" | sed 's/#.*//' | xargs)
  [[ -z "$skill" ]] && continue
  link_skill "$skill"
done < "$REPO/profiles/$PROFILE/skills.txt"

echo ""
echo "✓ Profile '$PROFILE' installed."
echo "  Launch: pi --profile $PROFILE"
echo "  Model: deepseek-v4-pro (thinking: high) — Planner"
echo "  Switch: Ctrl+P to deepseek-v4-flash (thinking: off) — Executor"
