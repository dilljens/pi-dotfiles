import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type WikiSubcommand = "make" | "onboard" | "update" | "refresh" | "check";

interface WikiCommand {
  name: string;
  desc: string;
  sub: WikiSubcommand;
}

const COMMANDS: WikiCommand[] = [
  { name: "wiki:make",    desc: "Initialize codebase wiki at docs/wiki/",               sub: "make" },
  { name: "wiki:onboard", desc: "Cold-start walkthrough for zero-context LLM",          sub: "onboard" },
  { name: "wiki:update",  desc: "Refresh wiki after code changes",                       sub: "update" },
  { name: "wiki:sync",    desc: "Upgrade wiki after wiki skill changes",                 sub: "refresh" },
  { name: "wiki:check",   desc: "Verify wiki consistency (cross-refs, links)",           sub: "check" },
];

export default function (pi: ExtensionAPI) {
  for (const cmd of COMMANDS) {
    pi.registerCommand(cmd.name, {
      description: cmd.desc,
      handler: async (_args, ctx) => {
        ctx.ui.notify(`Loading wiki skill (/${cmd.sub})...`, "info");
        pi.sendUserMessage(`/skill:wiki ${cmd.sub}`, { triggerTurn: true });
      },
    });
  }

  // /wiki alone — show help and ask which subcommand
  pi.registerCommand("wiki", {
    description: "Wiki commands: make, onboard, update, sync, check",
    handler: async (_args, ctx) => {
      const choice = await ctx.ui.select("Wiki command:", [
        { label: "make     — Initialize codebase wiki", value: "make" },
        { label: "onboard  — Cold-start walkthrough for zero-context LLM", value: "onboard" },
        { label: "update   — Refresh wiki after code changes", value: "update" },
        { label: "sync     — Upgrade wiki after skill changes", value: "refresh" },
        { label: "check    — Verify wiki consistency", value: "check" },
      ]);
      if (choice) {
        ctx.ui.notify(`Loading wiki skill (/${choice})...`, "info");
        pi.sendUserMessage(`/skill:wiki ${choice}`, { triggerTurn: true });
      }
    },
  });
}
