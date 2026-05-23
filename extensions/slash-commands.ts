import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text, DynamicBorder } from "@earendil-works/pi-tui";
import { Type } from "typebox";

/**
 * Slash Commands Browser Extension
 *
 * Provides both:
 *   - /commands (interactive slash command for the user)
 *   - get_commands (tool for the LLM to enumerate all slash commands)
 *
 * Built-in commands are hardcoded from the pi README. Extension/prompt/skill
 * commands are fetched via pi.getCommands() at runtime.
 */

interface CommandEntry {
  name: string;
  description: string;
  source: "builtin" | "extension" | "prompt" | "skill";
  location: string;
}

const BUILTIN_COMMANDS: Omit<CommandEntry, "source">[] = [
  { name: "login", description: "OAuth authentication", location: "pi" },
  { name: "logout", description: "Log out", location: "pi" },
  { name: "model", description: "Switch models", location: "pi" },
  { name: "scoped-models", description: "Enable/disable models for Ctrl+P cycling", location: "pi" },
  { name: "settings", description: "Thinking level, theme, message delivery, transport", location: "pi" },
  { name: "resume", description: "Pick from previous sessions", location: "pi" },
  { name: "new", description: "Start a new session", location: "pi" },
  { name: "name", description: "Set session display name", location: "pi" },
  { name: "session", description: "Show session info (file, ID, messages, tokens, cost)", location: "pi" },
  { name: "tree", description: "Jump to any point in the session and continue from there", location: "pi" },
  { name: "fork", description: "Create a new session from a previous user message", location: "pi" },
  { name: "clone", description: "Duplicate the current active branch into a new session", location: "pi" },
  { name: "compact", description: "Manually compact context, optional custom instructions", location: "pi" },
  { name: "copy", description: "Copy last assistant message to clipboard", location: "pi" },
  { name: "export", description: "Export session to HTML file", location: "pi" },
  { name: "share", description: "Upload as private GitHub gist with shareable HTML link", location: "pi" },
  { name: "reload", description: "Reload keybindings, extensions, skills, prompts, and context files", location: "pi" },
  { name: "hotkeys", description: "Show all keyboard shortcuts", location: "pi" },
  { name: "changelog", description: "Display version history", location: "pi" },
  { name: "quit", description: "Quit pi", location: "pi" },
];

function shortenPath(loc: string): string {
  const home = process.env.HOME || "";
  if (loc.startsWith(home)) {
    return "~" + loc.slice(home.length);
  }
  return loc;
}

function formatLocation(entry: CommandEntry): string {
  switch (entry.source) {
    case "builtin":
      return "pi built-in";
    case "extension":
      return shortenPath(entry.location);
    case "prompt":
      return `prompt: ${shortenPath(entry.location)}`;
    case "skill":
      return `skill: ${shortenPath(entry.location)}`;
    default:
      return entry.location;
  }
}

function gatherCommands(pi: ExtensionAPI): CommandEntry[] {
  const entries: CommandEntry[] = [];

  // 1. Built-in commands
  for (const cmd of BUILTIN_COMMANDS) {
    entries.push({ ...cmd, source: "builtin" });
  }

  // 2. Extension / prompt / skill commands via pi.getCommands()
  try {
    const extCommands = pi.getCommands();
    for (const cmd of extCommands) {
      entries.push({
        name: cmd.name,
        description: cmd.description ?? "",
        source: cmd.source as CommandEntry["source"],
        location: cmd.sourceInfo.path || cmd.sourceInfo.source || cmd.source,
      });
    }
  } catch {
    // pi.getCommands() may not be available in all contexts
  }

  // Sort: builtins first, then by source type, then by name
  entries.sort((a, b) => {
    const order = { builtin: 0, extension: 1, prompt: 2, skill: 3 };
    const diff = (order[a.source] ?? 99) - (order[b.source] ?? 99);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

function buildSelectItems(entries: CommandEntry[]): SelectItem[] {
  const items: SelectItem[] = [];
  let lastSource = "";

  for (const entry of entries) {
    const sourceLabel = entry.source === "builtin" ? "── Built-in ──"
      : entry.source === "extension" ? "── Extensions ──"
      : entry.source === "prompt" ? "── Prompt Templates ──"
      : "── Skills ──";

    if (sourceLabel !== lastSource) {
      items.push({
        value: `__header__${entry.source}`,
        label: sourceLabel,
        description: "",
      });
      lastSource = sourceLabel;
    }

    const location = formatLocation(entry);
    const desc = entry.description
      ? `${location} — ${entry.description}`
      : location;

    items.push({
      value: `/${entry.name}`,
      label: `/${entry.name}`,
      description: desc,
    });
  }

  return items;
}

export default function (pi: ExtensionAPI) {
  // ─── User slash command ─────────────────────────────────────────────────
  pi.registerCommand("commands", {
    description:
      "List all slash commands with their source locations. Use --file <path> to write to a file.",
    handler: async (args, ctx) => {
      const entries = gatherCommands(pi);

      // Check for --file argument first
      const fileMatch = args?.match(/--file\s+(\S+)/);
      if (fileMatch) {
        const filePath = fileMatch[1];
        const lines: string[] = [];
        let lastSource = "";

        for (const entry of entries) {
          const sourceLabel = entry.source === "builtin" ? "── Built-in ──"
            : entry.source === "extension" ? "── Extensions ──"
            : entry.source === "prompt" ? "── Prompt Templates ──"
            : "── Skills ──";

          if (sourceLabel !== lastSource) {
            if (lines.length > 0) lines.push("");
            lines.push(sourceLabel);
            lastSource = sourceLabel;
          }

          const cmdName = `/${entry.name}`;
          const location = formatLocation(entry);
          const desc = entry.description ? ` — ${entry.description}` : "";
          lines.push(`  ${cmdName.padEnd(24)}${location}${desc}`);
        }

        const output = lines.join("\n");
        try {
          const fs = await import("node:fs");
          fs.writeFileSync(filePath, output, "utf-8");
          ctx.ui.notify(
            `Wrote ${entries.length} commands to ${filePath}`,
            "info",
          );
        } catch (err) {
          ctx.ui.notify(`Failed to write to ${filePath}: ${err}`, "error");
        }
        return;
      }

      // Build select list with section headers
      const items = buildSelectItems(entries);
      const headerText = `Slash Commands (${entries.length})`;

      ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
        container.addChild(
          new Text(theme.fg("accent", theme.bold(headerText)), 1, 0),
        );

        const maxVisible = Math.min(items.length, 20);
        const selectList = new SelectList(items, maxVisible, {
          selectedPrefix: (t) => theme.fg("accent", t),
          selectedText: (t) => theme.fg("accent", t),
          description: (t) => theme.fg("muted", t),
          scrollInfo: (t) => theme.fg("dim", t),
          noMatch: (t) => theme.fg("warning", t),
        });
        selectList.onSelect = () => done(null);
        selectList.onCancel = () => done(null);
        container.addChild(selectList);

        container.addChild(
          new Text(
            theme.fg("dim", "Type to filter · esc to close"),
            1,
            0,
          ),
        );
        container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

        return {
          render(w) {
            return container.render(w);
          },
          invalidate() {
            container.invalidate();
          },
          handleInput(data) {
            selectList.handleInput(data);
            tui.requestRender();
          },
        };
      });
    },
  });

  // ─── LLM tool ──────────────────────────────────────────────────────────
  pi.registerTool({
    name: "list_commands",
    label: "List Commands",
    description:
      "List all available slash commands with their source locations (built-in, extension, or skill). Use this when the user asks what commands are available, where a command comes from, or how to use something.",
    parameters: Type.Object({
      filter: Type.Optional(
        Type.String({
          description:
            "Optional filter term to search commands by name, description, or source location",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const entries = gatherCommands(pi);
      const filter = params.filter?.toLowerCase().trim();

      const filtered = filter
        ? entries.filter(
            (e) =>
              e.name.toLowerCase().includes(filter) ||
              e.description.toLowerCase().includes(filter) ||
              e.source.toLowerCase().includes(filter) ||
              e.location.toLowerCase().includes(filter),
          )
        : entries;

      const grouped = filtered.reduce(
        (acc, entry) => {
          const list = acc[entry.source] || [];
          list.push(entry);
          acc[entry.source] = list;
          return acc;
        },
        {} as Record<string, CommandEntry[]>,
      );

      // Build structured return
      const sections: string[] = [];
      const sourceLabels: Record<string, string> = {
        builtin: "Built-in",
        extension: "Extensions",
        prompt: "Prompt Templates",
        skill: "Skills",
      };

      for (const [source, cmds] of Object.entries(grouped)) {
        sections.push(`── ${sourceLabels[source] || source} ──`);
        for (const cmd of cmds) {
          const location = formatLocation(cmd);
          sections.push(
            `  /${cmd.name.padEnd(20)} ${location}  ${cmd.description}`,
          );
        }
        sections.push("");
      }

      const text = sections.join("\n").trim();
      const summary = `Found ${filtered.length} command(s)${filter ? ` matching "${filter}"` : ""} out of ${entries.length} total.`;

      return {
        content: [{ type: "text", text: `${summary}\n\n${text}` }],
        details: {
          total: entries.length,
          filtered: filtered.length,
          filter: params.filter ?? null,
          commands: filtered.map((e) => ({
            name: e.name,
            source: e.source,
            location: e.location,
            description: e.description,
          })),
        },
      };
    },
  });
}
