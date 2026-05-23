/**
 * /yeet — Stage all changes, commit with a descriptive message, and push.
 *
 * Usage:
 *   /yeet           Full yeet: git add . → commit → push
 *   /yeet commit    Add + commit only, no push
 *   /yeet <msg>     Use <msg> as the commit message directly, skip generation
 *
 * Replaces the old yeet SKILL.md.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("yeet", {
    description:
      "Stage all (git add .), commit with a descriptive message, and push. /yeet commit to skip push. /yeet <msg> to use a custom message.",
    getArgumentCompletions: (prefix: string) => {
      const items = [
        { value: "commit", label: "commit — add + commit only, no push" },
      ];
      const filtered = items.filter((i) => i.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args: string, ctx) => {
      const trimmed = args.trim();
      const skipPush =
        trimmed === "commit" ||
        trimmed === "--commit" ||
        trimmed === "-c";
      const customMessage = trimmed && !skipPush ? trimmed : null;

      // Check we're in a git repo
      try {
        const { execSync } = await import("node:child_process");
        execSync("git rev-parse --is-inside-work-tree 2>/dev/null", {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch {
        ctx.ui.notify("Not in a git repository", "error");
        return;
      }

      // Check for changes
      let hasChanges = false;
      try {
        const { execSync } = await import("node:child_process");
        const status = execSync("git status --porcelain", {
          encoding: "utf-8",
        }).trim();
        hasChanges = status.length > 0;
      } catch {
        // fall through
      }

      if (!hasChanges) {
        ctx.ui.notify("Nothing to stage — working tree clean", "info");
        return;
      }

      // Build the prompt for the LLM
      let prompt: string;

      if (customMessage) {
        prompt = [
          "## /yeet with custom message",
          "",
          "I've specified the commit message. Execute this:",
          "",
          '```bash',
          'git add .',
          '```',
          '',
          '```bash',
          `git commit -m "${customMessage.replace(/"/g, '\\"')}"`,
          '```',
          ...(skipPush
            ? []
            : [
                '',
                'Then push:',
                '```bash',
                'git push',
                '```',
              ]),
        ].join("\n");
      } else {
        const steps = [
          "## /yeet",
          "",
          "Stage everything, commit with a descriptive message,",
          skipPush ? "and commit only (no push)." : "and push.",
          "",
          "### Instructions",
          "",
          "1. **Stage all changes**",
          "   ```bash",
          "   git add .",
          "   ```",
          "",
          "2. **Review the diff**",
          "   ```bash",
          "   git diff --cached",
          "   ```",
          "",
          "3. **Write a concise commit message** based on the diff. Use conventional commit format:",
          '   - `feat:` — new feature',
          '   - `fix:` — bug fix',
          '   - `refactor:` — code restructuring',
          '   - `chore:` — maintenance, tooling, dependencies',
          '   - `docs:` — documentation only',
          '   - `style:` — formatting, whitespace',
          '   - `perf:` — performance improvement',
          '   - `test:` — adding or updating tests',
          "",
          "   Format: one-liner title line followed by a blank line then bullet points summarizing the key changes.",
          "",
          "4. **Commit**",
          "   ```bash",
          "   git commit -m \"<message>\"",
          "   ```",
        ];

        if (!skipPush) {
          steps.push(
            "",
            "5. **Push**",
            "   ```bash",
            "   git push",
            "   ```",
          );
        }

        steps.push(
          "",
          "If there's nothing to stage (shouldn't happen since we pre-checked), notify instead of making an empty commit.",
        );

        prompt = steps.join("\n");
      }

      // Send as a user message to trigger the LLM
      pi.sendUserMessage(prompt);
    },
  });
}
