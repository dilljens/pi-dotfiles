#!/usr/bin/env bash
# _lib.sh — shared helpers for pi-dotfiles profile installers
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="${HOME}/.pi/agent"

# ── link_skills ──────────────────────────────────────────────────────────
# Symlinks entire REPO_ROOT/skills/ → ~/.pi/agent/skills/custom/
link_skills() {
  local src="${REPO_ROOT}/skills"
  local target="${AGENT_DIR}/skills/custom"

  if [ ! -d "$src" ]; then return; fi

  # Clean up old custom-skills link from dilljens/custom-skills
  local old="${AGENT_DIR}/skills/custom-skills"
  if [ -L "$old" ] || [ -d "$old" ]; then
    rm -rf "$old"
  fi

  mkdir -p "$(dirname "$target")"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "  WARNING: $target exists as real dir — skipping"
    return
  fi
  rm -f "$target"
  ln -sf "$src" "$target"
  echo "  skills/ ✓"
}

# ── link_skill <path> ────────────────────────────────────────────────────
# Example: link_skill engineering/maintain-wiki
# Symlinks REPO_ROOT/skills/engineering/maintain-wiki → ~/.pi/agent/skills/custom/engineering/maintain-wiki
link_skill() {
  local skill_path="$1"
  local src="${REPO_ROOT}/skills/${skill_path}"
  local target="${AGENT_DIR}/skills/custom/${skill_path}"
  local target_dir
  target_dir="$(dirname "$target")"

  if [ ! -d "$src" ]; then
    echo "  WARNING: skill not found at $src — skipping"
    return
  fi

  mkdir -p "$target_dir"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "  WARNING: $target exists as real dir — skipping"
    return
  fi
  rm -f "$target"
  ln -sf "$src" "$target"
  echo "  linked $skill_path"
}

# ── link_extensions ──────────────────────────────────────────────────────
# Symlinks all extensions from REPO_ROOT/extensions/ into ~/.pi/agent/extensions/
link_extensions() {
  local src="${REPO_ROOT}/extensions"
  local target="${AGENT_DIR}/extensions"

  if [ ! -d "$src" ]; then return; fi

  for item in "$src"/*; do
    local name
    name="$(basename "$item")"
    local dest="${target}/${name}"

    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
      echo "  WARNING: $dest exists — skipping"
      continue
    fi
    rm -f "$dest"
    ln -sf "$item" "$dest"
    echo "  extension: $name"
  done
}

# ── link_agents ──────────────────────────────────────────────────────────
link_agents() {
  local src="${REPO_ROOT}/agents"
  local target="${AGENT_DIR}/agents"

  if [ ! -d "$src" ]; then return; fi

  mkdir -p "$target"
  for f in "$src"/*.md; do
    [ -f "$f" ] || continue
    local name
    name="$(basename "$f")"
    local dest="${target}/${name}"

    if [ -f "$dest" ] && [ ! -L "$dest" ]; then
      echo "  WARNING: $dest exists — skipping"
      continue
    fi
    rm -f "$dest"
    ln -sf "$f" "$dest"
    echo "  agent: $name"
  done
}

# ── link_packages ────────────────────────────────────────────────────────
# Symlinks packages/ dir contents into ~/.pi/agent/npm/node_modules/
link_packages() {
  local src="${REPO_ROOT}/packages"
  local target="${AGENT_DIR}/npm/node_modules"

  if [ ! -d "$src" ]; then return; fi
  mkdir -p "$target"

  for item in "$src"/*; do
    [ -e "$item" ] || continue
    local name
    name="$(basename "$item")"
    local dest="${target}/${name}"

    if [ -d "$dest" ] && [ ! -L "$dest" ]; then
      mv "$dest" "${dest}.bak"
      echo "  backed up ${name} → ${name}.bak"
    fi
    rm -f "$dest"
    ln -sf "$item" "$dest"
    echo "  package: $name"
  done
}
