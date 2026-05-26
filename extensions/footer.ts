/**
 * Footer Extension — standalone TUI footer with agent status, token stats, context usage.
 *
 * Layout:
 *   ~/project (branch)
 *   ↑tokens ↓tokens $cost context/total  [plan]  model  auth:profile  • thinking
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	let enabled = false;

	function createFooterRenderer(
		ctx: any,
		theme: any,
		footerData: any,
		width: number
	): string[] {
		const fmt = (n: number) =>
			n < 1000 ? String(n) : (n / 1000).toFixed(1) + "k";

		// ── Token stats ──
		let input = 0, output = 0, cost = 0;
		for (const e of ctx.sessionManager.getBranch()) {
			if (e.type === "message" && (e as any).message?.role === "assistant") {
				const m = (e as any).message as AssistantMessage;
				input += m.usage.input;
				output += m.usage.output;
				cost += m.usage.cost.total;
			}
		}

		// ── Context usage ──
		let contextStr = "";
		try {
			const ctxUsage = ctx.getContextUsage?.();
			if (ctxUsage && ctxUsage.tokens !== null && ctxUsage.percent !== null) {
				const rawTokens = fmt(ctxUsage.tokens);
				const windowFmt = fmt(ctxUsage.contextWindow);
				const pct = ctxUsage.percent;
				const pctColor = pct > 90 ? theme.fg("error", rawTokens) :
					pct > 70 ? theme.fg("warning", rawTokens) :
					theme.fg("dim", rawTokens);
				contextStr = " " + pctColor + theme.fg("dim", "/" + windowFmt);
			} else {
				contextStr = " " + theme.fg("dim", "?/" + fmt(ctxUsage?.contextWindow ?? 0));
			}
		} catch {
			contextStr = "";
		}

		// ── Model info ──
		const modelId = ctx.model?.id || "no-model";

		// ── Thinking level ──
		let thinkingLevel = "?";
		for (const e of ctx.sessionManager.getBranch()) {
			if (e.type === "thinking_level_change") {
				thinkingLevel = (e as any).thinkingLevel;
			}
		}

		// ── Plan mode status (already colored by plan-mode extension) ──
		const statuses = footerData.getExtensionStatuses();
		const rawPlanStatus = statuses.get("plan-mode") || "";
		// Simplify: just detect if plan mode is active
		const planActive = rawPlanStatus.includes("plan") || rawPlanStatus.includes("build");
		const planLabel = planActive ? "  " + theme.fg("warning", "plan") : "";

		// ── Auth profile ──
		const home = process.env.HOME || "";
		const profilesDir = home + "/.pi/agent-profiles";
		let authProfile = "";
		try {
			const fs = require("fs");
			const profiles = fs.readdirSync(profilesDir, { withFileTypes: true });
			for (const entry of profiles) {
				if (!entry.isDirectory()) continue;
				const authPath = profilesDir + "/" + entry.name + "/auth.json";
				if (fs.existsSync(authPath)) {
					try {
						const content = JSON.parse(fs.readFileSync(authPath, "utf-8"));
						if (content && typeof content === "object" && Object.keys(content).length > 0) {
							authProfile = entry.name;
							break;
						}
					} catch {}
				}
			}
		} catch {}

		// ── Git branch ──
		const branch = footerData.getGitBranch();

		// ── CWD path ──
		const cwd = ctx.cwd;
		const displayPath = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;

		// ── Line 1: path (branch) ──
		const line1 = truncateToWidth(theme.fg("dim", displayPath + (branch ? " (" + branch + ")" : "")), width);

		// ── Line 2: tokens | context | [plan] | model | auth:profile | • thinking ──
		const stats = theme.fg("dim",
			"↑" + fmt(input) + " ↓" + fmt(output) + " $" + cost.toFixed(3)
		) + contextStr;

		const rightBlock = theme.fg("dim",
			modelId +
			(authProfile ? "  " + theme.fg("accent", "auth:" + authProfile) : "") +
			"  " + theme.fg("accent", "• " + thinkingLevel)
		);

		const statsW = visibleWidth(stats) + visibleWidth(planLabel);
		const rightW = visibleWidth(rightBlock);
		const pad = " ".repeat(Math.max(1, width - statsW - rightW));
		const line2 = truncateToWidth(stats + planLabel + pad + rightBlock, width);

		return [line1, line2];
	}

	pi.registerCommand("footer", {
		description: "Toggle custom footer",
		handler: async (_args, ctx) => {
			enabled = !enabled;

			if (enabled) {
				ctx.ui.setFooter((tui, theme, footerData) => {
					const unsub = footerData.onBranchChange(() => tui.requestRender());
					return {
						dispose: unsub,
						invalidate() {},
						render(width: number): string[] {
							return createFooterRenderer(ctx, theme, footerData, width);
						},
					};
				});
				ctx.ui.notify("Custom footer enabled", "info");
			} else {
				ctx.ui.setFooter(undefined);
				ctx.ui.notify("Default footer restored", "info");
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		if (!enabled) {
			enabled = true;
			ctx.ui.setFooter((tui, theme, footerData) => {
				const unsub = footerData.onBranchChange(() => tui.requestRender());
				return {
					dispose: unsub,
					invalidate() {},
					render(width: number): string[] {
						return createFooterRenderer(ctx, theme, footerData, width);
					},
				};
			});
		}
	});
}
