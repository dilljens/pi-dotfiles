/**
 * Auto-name Extension — automatically names sessions with project prefix.
 *
 * After the first assistant turn, generates a concise title from the first
 * user message and sets the session name to "{project}: {title}".
 *
 * The project name is derived from ctx.cwd's basename.
 *
 * Usage:
 *   /autoname          — Manually trigger auto-naming
 *   /autoname off      — Disable auto-naming for this session
 *   /autoname on       — Re-enable auto-naming
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { basename } from "node:path";

// ── State ──────────────────────────────────────────────────────────────────

let enabled = true;

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 55;
const ELLIPSIS = "…";

// ── Extension registration ─────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // Auto-name after the first assistant turn
  pi.on("turn_end", async (event, ctx) => {
    if (!enabled) return;
    if (event.turnIndex !== 0) return; // only on first turn
    if (ctx.sessionManager.getSessionName()) return; // already named

    const project = projectFromCwd(ctx.cwd);
    const raw = firstMessageFromSession(ctx);
    const title = cleanTitle(raw);
    if (!title) return;

    const sessionName = `${project}: ${title}`;
    pi.setSessionName(sessionName);
  });

  // /autoname command
  pi.registerCommand("autoname", {
    description: "Auto-name session (usage: /autoname [on|off])",
    handler: async (args, ctx) => {
      const trimmed = args.trim().toLowerCase();

      if (trimmed === "off") {
        enabled = false;
        ctx.ui.notify("Auto-naming disabled", "info");
        return;
      }
      if (trimmed === "on") {
        enabled = true;
        ctx.ui.notify("Auto-naming enabled", "info");
        return;
      }

      // Manually trigger naming
      const project = projectFromCwd(ctx.cwd);
      const raw = firstMessageFromSession(ctx);
      const title = cleanTitle(raw);

      if (title) {
        const sessionName = `${project}: ${title}`;
        pi.setSessionName(sessionName);
        ctx.ui.notify(`Session named: ${sessionName}`, "info");
      } else {
        ctx.ui.notify("Could not generate a title from the conversation", "warn");
      }
    },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function projectFromCwd(cwd: string): string {
  return basename(cwd) || "unknown";
}

/** Get the first user message from the session, or empty string. */
function firstMessageFromSession(ctx: { sessionManager: { getBranch: () => any[]; getHeader?: () => any } }): string {
  // Try getting from session header first
  try {
    const header = (ctx.sessionManager as any).getHeader?.();
    if (header?.firstMessage && typeof header.firstMessage === "string") {
      return header.firstMessage;
    }
  } catch {
    // fall through
  }

  // Fallback: walk the branch for the first user message
  try {
    const entries = ctx.sessionManager.getBranch();
    for (const entry of entries) {
      if (entry.type === "message" && (entry as any).message?.role === "user") {
        const text = extractText((entry as any).message);
        if (text) return text;
      }
    }
  } catch {
    // ignore
  }

  return "";
}

function extractText(msg: any): string {
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join(" ");
  }
  return "";
}

/** Clean a raw message into a short readable title. */
function cleanTitle(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Remove multiline code blocks (```...```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code backticks
  text = text.replace(/`[^`]+`/g, "");

  // Remove markdown images
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");

  // Remove markdown links — keep text, drop URL
  text = text.replace(/\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Remove bare URLs
  text = text.replace(/https?:\/\/\S+/g, "");

  // Remove leading punctuation/symbols (slashes, bullets, dashes, etc.)
  text = text.replace(/^[\s\/#*\-•·]+/, "");

  // Take first line only
  const firstLine = text.split("\n")[0];
  text = firstLine.trim();

  // Collapse whitespace
  text = text.replace(/\s+/g, " ");

  // Strip trailing punctuation
  text = text.replace(/[.,;:!?]+$/, "");

  // Truncate
  if (text.length > MAX_TITLE_LENGTH) {
    text = text.slice(0, MAX_TITLE_LENGTH).trimEnd() + ELLIPSIS;
  }

  return text.trim();
}
