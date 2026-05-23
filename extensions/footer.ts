/**
 * Footer Extension — standalone TUI footer with agent status, token stats, context usage.
 *
 * This extension replaces the built-in footer. It reads extension statuses
 * (including "agent" from pi-agent-mode) and renders a compact two-line status bar.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	let enabled = false;

	// Footer statuses we care about
	const AGENT_STATUS_KEY = "agent";

	// Shared render function — used by both the /footer command and session_start handler
	function createFooterRenderer(
		ctx: any,
		theme: any,
		footerData: any,
		width: number
	): string[] {
		const fmt = (n: number) =>
			n < 1000 ? String(n) : (n / 1000).toFixed(1) + "k";

		// ── Token stats from session ──
		let input = 0, output = 0, cost = 0;
		for (const e of ctx.sessionManager.getBranch()) {
			if (e.type === "message" && e.message.role === "assistant") {
				const m = e.message as AssistantMessage;
				input += m.usage.input;
				output += m.usage.output;
				cost += m.usage.cost.total;
			}
		}

		// ── Context usage (raw tokens) ──
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

		// ── Git branch ──
		const branch = footerData.getGitBranch();

		// ── CWD path ──
		const cwd = ctx.cwd;
		const home = process.env.HOME || "";
		const displayPath = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;

		// ── Extension statuses (agent from pi-agent-mode) ──
		const statuses = footerData.getExtensionStatuses();
		const agentStatus = statuses.get(AGENT_STATUS_KEY);

		// ── Build line 1: path left, agent right ──
		const left1 = theme.fg("dim", displayPath + (branch ? " (" + branch + ")" : ""));
		const right1 = agentStatus ? theme.fg("dim", agentStatus) : "";
		const pad1 = right1 ? " ".repeat(Math.max(1, width - visibleWidth(left1) - visibleWidth(right1))) : "";
		const line1 = truncateToWidth(left1 + pad1 + (right1 || ""), width);

		// ── Build line 2: tokens + context on left, model on right ──
		const left2 = theme.fg("dim",
			"↑" + fmt(input) + " ↓" + fmt(output) +
			" $" + cost.toFixed(3)
		) + contextStr;

		const provider = ctx.model?.provider || "";
		const modelId = ctx.model?.id || "no-model";
		const right2 = theme.fg("dim", (provider ? "(" + provider + ") " : "") + modelId);

		const left2w = visibleWidth(left2);
		const right2w = visibleWidth(right2);
		const pad2 = " ".repeat(Math.max(1, width - left2w - right2w));
		const line2 = truncateToWidth(left2 + pad2 + right2, width);

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

	// Enable by default on first load
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
