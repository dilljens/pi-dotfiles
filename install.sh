#!/usr/bin/env bash
set -euo pipefail
echo "=== Pi Installer ==="
echo ""

REPO="$(cd "$(dirname "$0")" && pwd)"
source "$REPO/scripts/_lib.sh"

AGENT_DIR="${HOME}/.pi/agent"

# ── 1. Agent directory ──────────────────────────────────────────────────
mkdir -p "$AGENT_DIR"
echo "Agent dir: $AGENT_DIR"

# ── 2. Settings ─────────────────────────────────────────────────────────
# Substitute REPO path into settings.json so absolute skill paths match
sed "s|/home/dillon/pi-dotfiles|$REPO|g" "$REPO/settings.json" >"$AGENT_DIR/settings.json"
echo "  settings.json ✓"

# ── 3. Keybindings ──────────────────────────────────────────────────────
if [ -f "$REPO/keybindings.json" ]; then
	cp "$REPO/keybindings.json" "$AGENT_DIR/"
	echo "  keybindings.json ✓"
fi

# ── 4. models.json ──────────────────────────────────────────────────────
if [ -f "$REPO/models.json" ]; then
	cp "$REPO/models.json" "$AGENT_DIR/models.json"
	echo "  models.json ✓"
fi

# ── 5. npm package.json ──────────────────────────────────────────────────
if [ -f "$REPO/npm/package.json" ]; then
	mkdir -p "$AGENT_DIR/npm"
	cp "$REPO/npm/package.json" "$AGENT_DIR/npm/package.json"
	echo "  npm/package.json ✓"
fi

# ── 6. Install npm packages ─────────────────────────────────────────────
echo ""
echo "Installing npm extensions..."
cd "$AGENT_DIR/npm" && npm install 2>&1 | tail -3

# ── 7. Shared symlinks (extensions, skills, agents, packages) ──────────
# Run AFTER npm install so local packages override registry versions
echo ""
echo "Symlinking shared assets..."
link_extensions
link_skills
link_agents
link_packages

echo ""
echo "✓ Pi installed. Launch: pi"
