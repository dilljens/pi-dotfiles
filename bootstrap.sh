#!/usr/bin/env bash
set -euo pipefail

# pi-dotfiles bootstrap — set up pi from scratch on a fresh machine.
# Run from the repo root:  ./bootstrap.sh

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="${HOME}/.pi/agent"

echo "==> Setting up pi dotfiles from ${REPO_DIR}"

mkdir -p "${AGENT_DIR}/agents" "${AGENT_DIR}/extensions" "${AGENT_DIR}/npm/node_modules"

# ── Agents ──────────────────────────────────────────────────────────────
echo "==> Symlinking agents..."
for f in agents/*.md; do
  name="$(basename "$f")"
  target="${AGENT_DIR}/agents/${name}"
  [ -f "$target" ] && [ ! -L "$target" ] && echo "  WARNING: ${target} exists — skipping" && continue
  ln -sf "${REPO_DIR}/${f}" "$target"
  echo "  ${name}"
done

# ── Extensions ──────────────────────────────────────────────────────────
echo "==> Symlinking extensions..."
for item in extensions/*; do
  name="$(basename "$item")"
  target="${AGENT_DIR}/extensions/${name}"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "  WARNING: ${target} exists — skipping"
  else
    rm -f "$target"
    ln -sf "${REPO_DIR}/${item}" "$target"
    echo "  ${name}"
  fi
done

# ── Settings ────────────────────────────────────────────────────────────
if [ -f settings.json ]; then
  echo "==> Copying settings.json..."
  cp settings.json "${AGENT_DIR}/settings.json"
fi

# ── Custom skills ──────────────────────────────────────────────────────
SKILL_TARGET="${AGENT_DIR}/skills/custom"
OLD_SKILLS="${AGENT_DIR}/skills/custom-skills"

echo "==> Symlinking custom skills..."

# Remove old custom-skills (from previous dilljens/custom-skills setup)
if [ -L "$OLD_SKILLS" ] || [ -d "$OLD_SKILLS" ]; then
  echo "  Removing old custom-skills link..."
  rm -rf "$OLD_SKILLS"
fi

mkdir -p "$(dirname "$SKILL_TARGET")"
if [ -e "$SKILL_TARGET" ] && [ ! -L "$SKILL_TARGET" ]; then
  echo "  WARNING: ${SKILL_TARGET} exists as a real directory — skipping"
else
  rm -f "$SKILL_TARGET"
  ln -sf "${REPO_DIR}/skills" "$SKILL_TARGET"
  echo "  $SKILL_TARGET → skills/"
fi

# ── pi-agent-mode (npm package for editable dev) ──────────────────────
echo "==> Installing / symlinking pi-agent-mode..."
NPM_DIR="${AGENT_DIR}/npm/node_modules"
if [ -d "${NPM_DIR}/pi-agent-mode" ] && [ ! -L "${NPM_DIR}/pi-agent-mode" ]; then
  # pi install already ran — swap for editable symlink
  mv "${NPM_DIR}/pi-agent-mode" "${NPM_DIR}/pi-agent-mode.bak"
fi
if [ -d "${REPO_DIR}/pi-agent-mode" ]; then
  ln -sf "${REPO_DIR}/pi-agent-mode" "${NPM_DIR}/pi-agent-mode"
  echo "  pi-agent-mode → repo copy (editable)"
else
  # Install from npm if we don't have a local copy
  if command -v pi &>/dev/null && [ ! -d "${NPM_DIR}/pi-agent-mode" ]; then
    pi install npm:pi-agent-mode 2>/dev/null || true
  fi
fi

# ── npm packages ──────────────────────────────────────────────────────
echo "==> Installing npm packages..."
if command -v pi &>/dev/null; then
  for pkg in pi-agent-browser-native; do
    if [ ! -d "${NPM_DIR}/${pkg}" ]; then
      echo "  Installing ${pkg}..."
      pi install "npm:${pkg}" 2>/dev/null || echo "  WARNING: could not install ${pkg}"
    else
      echo "  ${pkg} already installed"
    fi
  done
else
  echo "  WARNING: 'pi' not on PATH — install pi first, then re-run"
fi

echo ""
echo "==> Done! Run \`/reload\` in pi to pick up changes."
echo "    Custom skills are at \`~/.pi/agent/skills/custom/\`"
