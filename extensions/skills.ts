import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import {
  Container,
  type SelectItem,
  SelectList,
  Text,
  matchesKey,
  Key,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, basename, dirname } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  description: string;
  category: string;
  skillDir: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const SKILLS_ROOT = join(
  process.env.HOME || "/home/dillon",
  ".pi",
  "agent",
  "skills",
);

function parseFrontmatter(content: string): Record<string, string> {
  const lines = content.split("\n");
  if (lines.length < 2 || lines[0].trim() !== "---") return {};
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (endIdx === -1) return {};

  const fm: Record<string, string> = {};
  let key = "";
  let val: string[] = [];

  function flush() {
    if (key) {
      fm[key] = val.join("\n").replace(/^\s+/gm, "").trim();
    }
  }

  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const m = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (m) {
      flush();
      key = m[1];
      const rest = m[2].trim();
      val = rest === "" || rest === "|" ? [] : [rest];
    } else {
      val.push(line);
    }
  }
  flush();
  return fm;
}

function findSkillFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        if (entry.isSymbolicLink()) {
          try {
            if (!statSync(fullPath).isDirectory()) continue;
          } catch {
            continue;
          }
        }
        results.push(...findSkillFiles(fullPath));
      } else if (entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch {
    // skip
  }
  return results;
}

function inferCategory(relPath: string): string {
  if (relPath.startsWith("anthropic")) return "Anthropic";
  if (relPath.startsWith("custom")) return "Custom";
  if (relPath.startsWith("pi-skills")) return "Pi Tools";
  if (relPath.startsWith("firecrawl")) return "Firecrawl";
  const parts = relPath.split(/[/\\]/);
  return parts[0] || "Other";
}

function inferSubcategory(skillDir: string): string | null {
  const parts = skillDir.split(/[/\\]/);
  const idx = parts.findIndex((p) => p === "custom-skills");
  if (idx !== -1 && parts.length > idx + 2) return parts[idx + 2];
  return null;
}

function loadSkills(root: string): Skill[] {
  const files = findSkillFiles(root);
  const skills: Skill[] = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(content);
      const name = fm.name || basename(dirname(filePath));
      const description = fm.description || "";
      const relPath = relative(root, filePath);
      const category = inferCategory(relPath);
      const subcat = inferSubcategory(dirname(filePath));
      const displayCategory = subcat ? `${category} / ${subcat}` : category;

      skills.push({
        name,
        description: description.slice(0, 200),
        category: displayCategory,
        skillDir: dirname(filePath),
      });
    } catch {
      // skip
    }
  }

  skills.sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return a.name.localeCompare(b.name);
  });

  return skills;
}

function buildSelectItems(skills: Skill[]): SelectItem[] {
  const items: SelectItem[] = [];
  let lastCat = "";
  for (const skill of skills) {
    if (skill.category !== lastCat) {
      lastCat = skill.category;
      items.push({
        value: `__header__${skill.category}`,
        label: `── ${skill.category} ──`,
        description: "",
      });
    }
    items.push({
      value: skill.skillDir,
      label: skill.name,
      description: skill.description,
    });
  }
  return items;
}

// ─── Extension ───────────────────────────────────────────────────────────

type Mode = "compact" | "detailed";

export default function (pi: ExtensionAPI) {
  let cachedSkills: Skill[] = [];

  pi.on("session_start", async () => {
    try {
      cachedSkills = loadSkills(SKILLS_ROOT);
    } catch {
      cachedSkills = [];
    }
  });

  pi.on("resources_discover", async () => {
    try {
      cachedSkills = loadSkills(SKILLS_ROOT);
    } catch {
      // keep previous cache
    }
  });

  pi.registerCommand("skills", {
    description: "Browse all pi skills grouped by category. Pass a term to pre-filter.",
    argumentHint: "[filter-term]",
    handler: async (args, ctx) => {
      const skills = cachedSkills;
      if (skills.length === 0) {
        ctx.ui.notify("No skills found. Run /reload to rescan.", "warning");
        return;
      }

      const filter = (args || "").trim().toLowerCase();
      const filtered = filter
        ? skills.filter(
            (s) =>
              s.name.toLowerCase().includes(filter) ||
              s.description.toLowerCase().includes(filter) ||
              s.category.toLowerCase().includes(filter),
          )
        : skills;

      if (filtered.length === 0) {
        ctx.ui.notify(`No skills match "${args}"`, "warning");
        return;
      }

      const items = buildSelectItems(filtered);

      const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        let mode: Mode = "compact";
        let compactCache: { width: number; lines: string[] } | null = null;
        let selectList: SelectList | null = null;

        // ── Build detailed (interactive) view ──
        const detailedContainer = new Container();
        const titleDetailed = filter
          ? `Skills matching "${args}" (${filtered.length})`
          : `All Skills (${filtered.length})`;

        detailedContainer.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
        detailedContainer.addChild(
          new Text(theme.fg("accent", theme.bold(titleDetailed)), 1, 0),
        );

        const maxVisible = Math.min(items.length, 18);
        selectList = new SelectList(items, maxVisible, {
          selectedPrefix: (t) => theme.fg("accent", t),
          selectedText: (t) => theme.fg("accent", t),
          description: (t) => theme.fg("muted", t),
          scrollInfo: (t) => theme.fg("dim", t),
          noMatch: (t) => theme.fg("warning", t),
        });
        selectList.onSelect = (item) => {
          if (item.value.startsWith("__header__")) return;
          done(item.value);
        };
        selectList.onCancel = () => done(null);
        detailedContainer.addChild(selectList);

        detailedContainer.addChild(
          new Text(
            theme.fg(
              "dim",
              "← → switch view · type to filter · ↑↓ navigate · enter select · esc cancel",
            ),
            1,
            0,
          ),
        );
        detailedContainer.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

        // ── Compact view renderer ──
        function renderCompact(width: number): string[] {
          if (compactCache && compactCache.width === width) return compactCache.lines;

          const lines: string[] = [];
          const titleCompact = filter
            ? `Skills matching "${args}" (${filtered.length})`
            : `All Skills (${filtered.length})`;

          // Top separator
          // (simple line since we're not in a Container)
          lines.push(
            theme.fg("dim", "─".repeat(Math.min(width, 60))),
          );

          // Title with mode indicator
          lines.push(
            theme.fg("accent", theme.bold(` ${titleCompact}  ◀ ▶`)),
          );
          lines.push("");

          // Group by category
          const groups = new Map<string, string[]>();
          for (const skill of filtered) {
            const list = groups.get(skill.category) || [];
            list.push(skill.name);
            groups.set(skill.category, list);
          }

          for (const [cat, names] of groups) {
            lines.push(theme.fg("accent", ` [${cat}]`));
            const commaList = `  ${names.join(", ")}`;
            const wrapped = wrapTextWithAnsi(commaList, width - 2);
            for (const segment of wrapped) {
              lines.push(theme.fg("muted", segment));
            }
            lines.push("");
          }

          // Footer help
          lines.push(
            theme.fg("dim", " ← → switch view · enter browse · esc cancel"),
          );

          compactCache = { width, lines };
          return lines;
        }

        // ── Returned component ──
        return {
          render(w: number): string[] {
            if (mode === "compact") return renderCompact(w);
            return detailedContainer.render(w);
          },
          invalidate() {
            compactCache = null;
            detailedContainer.invalidate();
          },
          handleInput(data: string) {
            if (matchesKey(data, Key.left) || matchesKey(data, Key.right)) {
              mode = mode === "compact" ? "detailed" : "compact";
              compactCache = null;
              tui.requestRender();
            } else if (mode === "detailed" && selectList) {
              selectList.handleInput(data);
              tui.requestRender();
            } else if (matchesKey(data, Key.escape)) {
              done(null);
            } else if (matchesKey(data, Key.enter)) {
              // In compact mode, Enter switches to detailed view
              mode = "detailed";
              compactCache = null;
              tui.requestRender();
            }
          },
        };
      });

      if (result) {
        const skillName = basename(result);
        ctx.ui.setEditorText(`/skill:${skillName}`);
        ctx.ui.notify(`Selected "${skillName}" — press Enter to load it`, "info");
      }
    },
  });
}
