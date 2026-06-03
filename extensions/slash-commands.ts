import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
// Note: LSP errors below are false positives. Pi loads extensions via jiti
// at runtime — no tsc compilation needed.

/**
 * Slash Commands Browser Extension
 *
 * Provides the `list_commands` tool for the AI to enumerate all available
 * slash commands (built-in, extension, prompt, skill).
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

export default function (pi: ExtensionAPI) {
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
