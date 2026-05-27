/**
 * Dump System Prompt Extension
 *
 * Writes the full assembled system prompt to a file in /home/dillon/Downloads/
 * on every agent start (each user prompt). Useful for inspecting what context
 * is loaded into the model.
 *
 * Files: /home/dillon/Downloads/system-prompt-<timestamp>.txt
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/home/dillon/Downloads";

export default function (pi: ExtensionAPI) {
  let dumpedThisSession = false;

  // Reset on new session
  pi.on("session_start", async () => {
    dumpedThisSession = false;
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!process.env.PI_DUMP_SYSTEM_PROMPT) return;
    if (dumpedThisSession) return;
    dumpedThisSession = true;

    // Get the system prompt — event.systemPrompt has the chained version
    const systemPrompt = event.systemPrompt ?? ctx.getSystemPrompt?.() ?? "";

    const now = new Date();
    const timestamp =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") + "-" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const outPath = join(OUT_DIR, `system-prompt-${timestamp}.txt`);

    try {
      writeFileSync(outPath, systemPrompt, "utf-8");
      ctx.ui.notify?.(`System prompt dumped → ${outPath}`, "info");
    } catch (err) {
      ctx.ui.notify?.(`Failed to dump system prompt: ${err}`, "error");
    }
  });
}
