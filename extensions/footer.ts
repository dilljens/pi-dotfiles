/**
 * Footer Extension — always-on custom TUI footer.
 *
 * Layout:
 *   ~/project (branch)
 *   ↑tokens ↓tokens $cost context/total  [plan]  deepseek-v4-flash  • high
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
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

		// ── Plan mode status ──
		const statuses = footerData.getExtensionStatuses();
		const rawPlanStatus = statuses.get("plan-mode") || "";
		const planActive = rawPlanStatus.includes("plan") || rawPlanStatus.includes("build");
		const planLabel = planActive ? "  " + theme.fg("warning", "plan") : "";

		// ── Git branch ──
		const branch = footerData.getGitBranch();

		// ── CWD path ──
		const home = process.env.HOME || "";
		const cwd = ctx.cwd;
		const displayPath = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;

		// ── Line 1: path (branch) ──
		const pathLeft = theme.fg("dim", displayPath + (branch ? " (" + branch + ")" : ""));
		const line1 = truncateToWidth(pathLeft, width);

		// ── Line 2: tokens | context | [plan] | model | • thinking ──
		const stats = theme.fg("dim",
			"↑" + fmt(input) + " ↓" + fmt(output) + " $" + cost.toFixed(3)
		) + contextStr;

		const rightBlock = theme.fg("dim",
			modelId +
			"  " + theme.fg("accent", "• " + thinkingLevel)
		);

		const statsW = visibleWidth(stats) + visibleWidth(planLabel);
		const rightW = visibleWidth(rightBlock);
		const pad = " ".repeat(Math.max(1, width - statsW - rightW));
		const line2 = truncateToWidth(stats + planLabel + pad + rightBlock, width);

		return [line1, line2];
	}

	pi.on("session_start", async (_event, ctx) => {
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
	});
}
