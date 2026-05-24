/**
 * Till Done Extension
 *
 * Plan -> Proposed -> Approved -> Gated finish.
 *
 * The agent creates tasks via `plan_task` tool or auto-extracts them from "Plan:" blocks.
 * Tasks start as **proposed** — they don't block exit yet. The user must explicitly
 * approve them (/till-done approve) before they become binding.
 *
 * Once active, pending tasks block:
 *   - session_before_switch (/new, /resume)
 *   - session_before_fork (/fork, /clone)
 *   - session_shutdown (quit)
 *
 * Features:
 *   - `plan_task` tool for the LLM (propose, add, list, toggle, remove, clear, approve)
 *   - Auto-extracts numbered tasks from "Plan:" / "## Steps:" blocks
 *   - `/till-done` command (overview, approve, done)
 *   - Session guards for active tasks
 *   - Widget + footer status
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";

// ─── Data model ──────────────────────────────────────────────────────────────

interface Task {
	id: number;
	text: string;
	done: boolean;
	/** True = user hasn't approved yet. These don't block exit. */
	proposed: boolean;
	createdAt: number;
}

interface TillDoneDetails {
	action: string;
	tasks: Task[];
	nextId: number;
	error?: string;
}

// ─── Plan -> Task extraction ──────────────────────────────────────────────────

/** Extract numbered tasks from an assistant message containing a plan header. */
function extractTasksFromPlan(text: string, existing: Task[], nextId: number): { tasks: Task[]; nextId: number } {
	const headerPattern = /\*{0,2}(?:Plan|Steps|Task\s*list|Todos|What\s+needs?\s+to\s+be\s+done):?\*{0,2}\s*\n/i;
	const headerMatch = text.match(headerPattern);
	if (!headerMatch) return { tasks: [...existing], nextId };

	const planSection = text.slice(text.indexOf(headerMatch[0]) + headerMatch[0].length);

	const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n]+)/gm;
	const checkboxPattern = /^\s*[-*]\s+\[[ x]?\]\s+(.+)$/gm;

	const result = { tasks: [...existing], nextId };
	const seen = new Set(result.tasks.map((t) => t.text.toLowerCase().trim()));

	let match: RegExpExecArray | null;
	let found = false;

	for (match of planSection.matchAll(numberedPattern)) {
		found = true;
		const t = match[2]
			.trim()
			.replace(/\*{1,2}$/, "")
			.trim()
			.replace(/\s+/g, " ")
			.trim();
		if (t.length < 3 || t.startsWith("`") || t.startsWith("/") || t.startsWith("-")) continue;
		const n = t.toLowerCase();
		if (!seen.has(n)) {
			seen.add(n);
			// Extracted tasks start as proposed
			result.tasks.push({ id: result.nextId++, text: t, done: false, proposed: true, createdAt: Date.now() });
		}
	}

	if (found) return result;

	for (match of planSection.matchAll(checkboxPattern)) {
		const t = match[1].trim().replace(/\s+/g, " ").trim();
		if (t.length < 3) continue;
		const n = t.toLowerCase();
		if (!seen.has(n)) {
			seen.add(n);
			result.tasks.push({ id: result.nextId++, text: t, done: false, proposed: true, createdAt: Date.now() });
		}
	}

	return result;
}

// ─── TUI component for /till-done command ─────────────────────────────────────

class TillDoneComponent {
	private tasks: Task[];
	private theme: Theme;
	private onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(tasks: Task[], theme: Theme, onClose: () => void) {
		this.tasks = tasks;
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

		const lines: string[] = [];
		const th = this.theme;
		const proposed = this.tasks.filter((t) => t.proposed);
		const active = this.tasks.filter((t) => !t.proposed);
		const activePending = active.filter((t) => !t.done);
		const activeDone = active.filter((t) => t.done);
		const total = this.tasks.length;

		lines.push("");
		const title = th.fg("accent", " Till Done ");
		const headerLine =
			th.fg("borderMuted", "\u2500".repeat(3)) + title + th.fg("borderMuted", "\u2500".repeat(Math.max(0, width - 13)));
		lines.push(truncateToWidth(headerLine, width));
		lines.push("");

		if (total === 0) {
			lines.push(truncateToWidth("  " + th.fg("dim", "No tasks. Ask the agent to plan something!"), width));
		} else {
			// Summary bar
			const activeTotal = active.length;
			const pct = activeTotal > 0 ? Math.round(((activeTotal - activePending.length) / activeTotal) * 100) : 0;
			if (activeTotal > 0) {
				const barWidth = Math.min(width - 6, 30);
				const filled = Math.round((pct / 100) * barWidth);
				const bar = th.fg("success", "\u2588".repeat(filled)) + th.fg("dim", "\u2591".repeat(barWidth - filled));
				lines.push(truncateToWidth("  " + bar + " " + th.fg("accent", pct + "%"), width));
				lines.push(truncateToWidth("  " + th.fg("muted", activeDone.length + "/" + activeTotal + " active tasks completed"), width));
			} else {
				lines.push("  " + th.fg("dim", "No approved tasks yet. Use /till-done approve to activate."));
			}

			// Proposed section
			if (proposed.length > 0) {
				lines.push("");
				lines.push("  " + th.fg("warning", "\u26A0 Proposed (awaiting approval)"));
				for (const t of proposed) {
					lines.push(truncateToWidth("    " + th.fg("dim", "\u25CB") + " " + th.fg("accent", "#" + t.id) + " " + t.text, width));
				}
				lines.push("  " + th.fg("dim", "  Use /till-done approve to activate these tasks"));
				lines.push("");
			}

			// Active pending section
			if (activePending.length > 0) {
				lines.push("");
				lines.push("  " + th.fg("text", "Active"));
				for (const t of activePending) {
					lines.push(truncateToWidth("    " + th.fg("dim", "\u25CB") + " " + th.fg("accent", "#" + t.id) + " " + t.text, width));
				}
			}

			// Active done section
			if (activeDone.length > 0) {
				lines.push("");
				lines.push("  " + th.fg("muted", "Completed"));
				for (const t of activeDone) {
					lines.push(
						truncateToWidth(
							"    " + th.fg("success", "\u2713") + " " + th.fg("accent", "#" + t.id) + " " + th.fg("dim", th.strikethrough(t.text)),
							width,
						),
					);
				}
			}
		}

		lines.push("");
		if (activePending.length > 0) {
			lines.push(truncateToWidth("  " + th.fg("warning", "\u26A0 Cannot finish \u2014 " + activePending.length + " active task(s) pending"), width));
			lines.push(truncateToWidth("  " + th.fg("dim", "Ask the agent to complete them, or use /till-done done to override"), width));
		} else if (active.length > 0) {
			lines.push("  " + th.fg("success", "\u2713 All active tasks done!"));
		}
		lines.push(truncateToWidth("  " + th.fg("dim", "Press Escape to close"), width));
		lines.push("");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

// ─── Module-level state ──────────────────────────────────────────────────────

let tasks: Task[] = [];
let nextId = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tasks that are both approved AND not yet done — these block exit. */
function activePendingCount(): number {
	return tasks.filter((t) => !t.proposed && !t.done).length;
}

function activeTotalCount(): number {
	return tasks.filter((t) => !t.proposed).length;
}

function totalCount(): number {
	return tasks.length;
}

function reconstructState(ctx: ExtensionContext): void {
	tasks = [];
	nextId = 1;

	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (msg.role !== "toolResult" || msg.toolName !== "plan_task") continue;

		const details = msg.details as TillDoneDetails | undefined;
		if (details) {
			tasks = details.tasks;
			nextId = details.nextId;
		}
	}
}

function updateUI(ctx: ExtensionContext): void {
	const proposed = tasks.filter((t) => t.proposed).length;
	const activePending = activePendingCount();
	const activeTotal = activeTotalCount();

	if (totalCount() === 0) {
		ctx.ui.setStatus("till-done", undefined);
		ctx.ui.setWidget("till-done", undefined);
		return;
	}

	// Footer status — show proposed count if any, otherwise active progress
	let label: string;
	if (proposed > 0) {
		label = ctx.ui.theme.fg("warning", "\uD83D\uDCCB " + proposed + " proposed");
	} else if (activePending > 0) {
		const pct = Math.round(((activeTotal - activePending) / activeTotal) * 100);
		label = ctx.ui.theme.fg("warning", "\uD83D\uDCCB " + activePending + "/" + activeTotal + " (" + pct + "%)");
	} else {
		label = ctx.ui.theme.fg("success", "\u2713 " + activeTotal + "/" + activeTotal);
	}
	ctx.ui.setStatus("till-done", label);

	// Widget
	const lines: string[] = [];
	if (proposed > 0) {
		lines.push(ctx.ui.theme.fg("warning", "  \u26A0 " + proposed + " task(s) proposed \u2014 /till-done approve"));
		for (const t of tasks) {
			if (!t.proposed) continue;
			lines.push("  " + ctx.ui.theme.fg("dim", "\u25CB") + " " + t.text);
		}
	}
	if (activePending > 0) {
		if (lines.length > 0) lines.push("");
		lines.push(ctx.ui.theme.fg("warning", "  \u26A0 " + activePending + " active task(s) pending — blocks exit"));
		for (const t of tasks) {
			if (t.proposed || t.done) continue;
			lines.push("  " + ctx.ui.theme.fg("dim", "\u25CB") + " " + t.text);
		}
		lines.push(ctx.ui.theme.fg("dim", "  Complete all or /till-done done to override."));
	}
	if (proposed === 0 && activePending === 0 && totalCount() > 0) {
		lines.push(ctx.ui.theme.fg("success", "  \u2713 All till-done tasks completed!"));
	}
	ctx.ui.setWidget("till-done", lines.length > 0 ? lines : undefined);
}

function scheduleUIUpdate(ctx: ExtensionContext): void {
	setTimeout(() => updateUI(ctx), 100);
}

// ─── Extension entry point ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
	// Reconstruct state on session events
	pi.on("session_start", async (_event, ctx) => {
		reconstructState(ctx);
		updateUI(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		reconstructState(ctx);
		updateUI(ctx);
	});

	// ─── LLM Tool — plan_task ─────────────────────────────────────────
	pi.registerTool({
		name: "plan_task",
		label: "Plan Task",
		description: "Manage a till-done task list. Actions: propose (text) or add (text) to create tasks, "
			+ "list, toggle (id), remove (id), clear, approve (moves proposed -> active). "
			+ "'propose' creates tasks that need user approval before they block exit. "
			+ "'add' creates tasks as immediately active (blocks exit). "
			+ "Use propose when drafting a plan for the user to review first.",
		promptSnippet: "Create or manage a task list that blocks exit until all tasks are done",
		promptGuidelines: [
			"Use plan_task action='propose' when drafting a plan — tasks start as proposed and need user approval.",
			"Use plan_task action='add' to create active tasks immediately without needing approval.",
			"Use plan_task action='approve' to prompt the user to approve proposed tasks (shows a confirmation dialog).",
			"Toggle tasks to done (action='toggle', id=<n>) as you complete them.",
		],
		parameters: Type.Object({
			action: StringEnum(["propose", "add", "list", "toggle", "remove", "clear", "approve"] as const),
			text: Type.Optional(Type.String({ description: "Task text (required for propose, add)" })),
			id: Type.Optional(Type.Number({ description: "Task ID (required for toggle, remove)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			switch (params.action) {
				case "list":
					return {
						content: [
							{
								type: "text",
								text: tasks.length
									? tasks.map((t) => {
										const prefix = t.proposed ? "p" : (t.done ? "x" : " ");
										return "[" + prefix + "] #" + t.id + ": " + t.text + (t.proposed ? " (proposed)" : "");
									}).join("\n")
									: "No tasks",
							},
						],
						details: { action: "list", tasks: [...tasks], nextId } as TillDoneDetails,
					};

				case "propose": {
					if (!params.text) {
						return {
							content: [{ type: "text", text: "Error: text required for propose" }],
							details: { action: "propose", tasks: [...tasks], nextId, error: "text required" } as TillDoneDetails,
						};
					}
					const newTask: Task = { id: nextId++, text: params.text, done: false, proposed: true, createdAt: Date.now() };
					tasks.push(newTask);
					const proposed = tasks.filter((t) => t.proposed).length;
					return {
						content: [{ type: "text", text: "Proposed task #" + newTask.id + ": " + newTask.text + " (" + proposed + " proposed total \u2014 use approve to activate)" }],
						details: { action: "propose", tasks: [...tasks], nextId } as TillDoneDetails,
					};
				}

				case "add": {
					if (!params.text) {
						return {
							content: [{ type: "text", text: "Error: text required for add" }],
							details: { action: "add", tasks: [...tasks], nextId, error: "text required" } as TillDoneDetails,
						};
					}
					const newTask: Task = { id: nextId++, text: params.text, done: false, proposed: false, createdAt: Date.now() };
					tasks.push(newTask);
					return {
						content: [{ type: "text", text: "Added active task #" + newTask.id + ": " + newTask.text + " (" + activePendingCount() + " active pending)" }],
						details: { action: "add", tasks: [...tasks], nextId } as TillDoneDetails,
					};
				}

				case "approve": {
					const proposed = tasks.filter((t) => t.proposed);
					if (proposed.length === 0) {
						return {
							content: [{ type: "text", text: "No proposed tasks to approve." }],
							details: { action: "approve", tasks: [...tasks], nextId } as TillDoneDetails,
						};
					}
					// Ask user for approval
					const list = proposed.map((t) => "  #" + t.id + ": " + t.text).join("\n");
					const ok = await _ctx.ui.confirm(
						"Approve Plan?",
						"Approve " + proposed.length + " proposed task(s)? They will block exit until completed.\n\n" + list,
					);
					if (!ok) {
						return {
							content: [{ type: "text", text: "User did not approve the proposed tasks. They remain proposed." }],
							details: { action: "approve", tasks: [...tasks], nextId, error: "user declined" } as TillDoneDetails,
						};
					}
					for (const t of tasks) {
						if (t.proposed) t.proposed = false;
					}
					return {
						content: [{ type: "text", text: "Approved " + proposed.length + " task(s). They now block exit until completed." }],
						details: { action: "approve", tasks: [...tasks], nextId } as TillDoneDetails,
					};
				}

				case "toggle": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for toggle" }],
							details: { action: "toggle", tasks: [...tasks], nextId, error: "id required" } as TillDoneDetails,
						};
					}
					const task = tasks.find((t) => t.id === params.id);
					if (!task) {
						return {
							content: [{ type: "text", text: "Task #" + params.id + " not found" }],
							details: { action: "toggle", tasks: [...tasks], nextId, error: "#" + params.id + " not found" } as TillDoneDetails,
						};
					}
					task.done = !task.done;
					// Toggling a proposed task activates it too
					if (task.proposed) task.proposed = false;
					const status = task.done ? "completed" : "reopened";
					const left = activePendingCount();
					return {
						content: [{ type: "text", text: "Task #" + task.id + " " + status + " (" + left + " active remaining)" }],
						details: { action: "toggle", tasks: [...tasks], nextId } as TillDoneDetails,
					};
				}

				case "remove": {
					if (params.id === undefined) {
						return {
							content: [{ type: "text", text: "Error: id required for remove" }],
							details: { action: "remove", tasks: [...tasks], nextId, error: "id required" } as TillDoneDetails,
						};
					}
					const idx = tasks.findIndex((t) => t.id === params.id);
					if (idx === -1) {
						return {
							content: [{ type: "text", text: "Task #" + params.id + " not found" }],
							details: { action: "remove", tasks: [...tasks], nextId, error: "#" + params.id + " not found" } as TillDoneDetails,
						};
					}
					const removed = tasks.splice(idx, 1)[0];
					return {
						content: [{ type: "text", text: "Removed task #" + removed.id }],
						details: { action: "remove", tasks: [...tasks], nextId } as TillDoneDetails,
					};
				}

				case "clear": {
					const count = tasks.length;
					tasks = [];
					nextId = 1;
					return {
						content: [{ type: "text", text: "Cleared " + count + " tasks" }],
						details: { action: "clear", tasks: [], nextId: 1 } as TillDoneDetails,
					};
				}

				default:
					return {
						content: [{ type: "text", text: "Unknown action: " + params.action }],
						details: { action: "list", tasks: [...tasks], nextId, error: "unknown action: " + params.action } as TillDoneDetails,
					};
			}
		},

		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("plan_task ")) + theme.fg("muted", args.action);
			if (args.text) text += " " + theme.fg("dim", '"' + args.text + '"');
			if (args.id !== undefined) text += " " + theme.fg("accent", "#" + args.id);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme, _context) {
			const details = result.details as TillDoneDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.error) {
				if (details.error === "user declined") {
					return new Text(theme.fg("warning", "Approval declined"), 0, 0);
				}
				return new Text(theme.fg("error", "Error: " + details.error), 0, 0);
			}

			const taskList = details.tasks;

			switch (details.action) {
				case "list": {
					if (taskList.length === 0) return new Text(theme.fg("dim", "No tasks"), 0, 0);
					const proposed = taskList.filter((t) => t.proposed);
					const activePending = taskList.filter((t) => !t.proposed && !t.done);
					const done = taskList.filter((t) => !t.proposed && t.done);
					let text = theme.fg("muted", taskList.length + " tasks:");
					if (proposed.length > 0) {
						const display = expanded ? proposed : proposed.slice(0, 3);
						text += "\n" + theme.fg("warning", "\u26A0 Proposed:");
						for (const t of display) {
							text += "\n" + theme.fg("dim", "\u25CB") + " " + theme.fg("accent", "#" + t.id) + " " + t.text;
						}
						if (!expanded && proposed.length > 3) {
							text += "\n" + theme.fg("dim", "... " + (proposed.length - 3) + " more proposed");
						}
					}
					if (activePending.length > 0) {
						const display = expanded ? activePending : activePending.slice(0, 5);
						text += "\n" + theme.fg("text", "Active:");
						for (const t of display) {
							text += "\n" + theme.fg("dim", "\u25CB") + " " + theme.fg("accent", "#" + t.id) + " " + t.text;
						}
						if (!expanded && activePending.length > 5) {
							text += "\n" + theme.fg("dim", "... " + (activePending.length - 5) + " more");
						}
					}
					if (done.length > 0) {
						text += "\n" + theme.fg("success", "\u2713 " + done.length + " completed");
					}
					return new Text(text, 0, 0);
				}

				case "propose": {
					const proposed = taskList.filter((t) => t.proposed);
					return new Text(
						theme.fg("warning", "\u26A0 Proposed ") +
							theme.fg("accent", "#" + (taskList[taskList.length - 1]?.id ?? "")) +
							" " +
							theme.fg("muted", (taskList[taskList.length - 1]?.text ?? "")) +
							theme.fg("dim", " (" + proposed.length + " proposed)"),
						0,
						0,
					);
				}

				case "add": {
					const added = taskList[taskList.length - 1];
					return new Text(
						theme.fg("success", "\u2713 Added ") +
							theme.fg("accent", "#" + added.id) +
							" " +
							theme.fg("muted", added.text) +
							theme.fg("dim", " (" + activePendingCount() + " active pending)"),
						0,
						0,
					);
				}

				case "approve": {
					const activePending = taskList.filter((t) => !t.proposed && !t.done).length;
					return new Text(
						theme.fg("success", "\u2713 Approved \u2014 " + activePending + " active tasks pending"),
						0,
						0,
					);
				}

				case "toggle": {
					const activePending = taskList.filter((t) => !t.proposed && !t.done).length;
					const activeTotal = taskList.filter((t) => !t.proposed).length;
					const pct = activeTotal > 0 ? Math.round(((activeTotal - activePending) / activeTotal) * 100) : 0;
					return new Text(
						theme.fg("success", "\u2713 " + activePending + " remaining (" + pct + "%)"),
						0,
						0,
					);
				}

				case "remove":
					return new Text(theme.fg("muted", "Removed"), 0, 0);

				case "clear":
					return new Text(theme.fg("success", "\u2713 Cleared all tasks"), 0, 0);
			}
		},
	});

	// ─── Auto-extract tasks from "Plan:" blocks ───────────────────────
	pi.on("turn_end", async (event, ctx) => {
		const msg = event.message;
		if (msg.role !== "assistant" || !Array.isArray(msg.content)) return;

		const text = msg.content
			.filter((c) => c.type === "text")
			.map((c) => c.text)
			.join("\n");

		const result = extractTasksFromPlan(text, tasks, nextId);
		if (result.tasks.length !== tasks.length || result.nextId !== nextId) {
			tasks = result.tasks;
			nextId = result.nextId;
			scheduleUIUpdate(ctx);
		}
	});

	// ─── Session Guards ───────────────────────────────────────────────
	// Only block for ACTIVE (approved, non-proposed) pending tasks.

	const guardMessage = (count: number): string =>
		"You have " + count + " active till-done task(s) pending. Complete them or use /till-done done to override.";

	pi.on("session_before_switch", async (event, ctx) => {
		const pending = activePendingCount();
		if (pending === 0) return;
		if (!ctx.hasUI) return { cancel: true };

		const action = event.reason === "new" ? "start a new session" : "switch sessions";
		const choice = await ctx.ui.select(
			"\u26A0 " + guardMessage(pending) + "\n\n" + action + " anyway?",
			["No, stay here", "Yes, discard tasks"],
		);

		if (choice !== "Yes, discard tasks") {
			ctx.ui.notify("Stay \u2014 complete pending tasks first or use /till-done done to override", "warning");
			return { cancel: true };
		}
	});

	pi.on("session_before_fork", async (event, ctx) => {
		const pending = activePendingCount();
		if (pending === 0) return;
		if (!ctx.hasUI) return { cancel: true };

		const choice = await ctx.ui.select(
			"\u26A0 " + guardMessage(pending) + "\n\nFork anyway?",
			["No, stay here", "Yes, fork without tasks"],
		);

		if (choice !== "Yes, fork without tasks") {
			ctx.ui.notify("Fork cancelled \u2014 complete tasks first or use /till-done done to override", "warning");
			return { cancel: true };
		}
	});

	pi.on("session_shutdown", async (event, ctx) => {
		const pending = activePendingCount();
		if (pending === 0) return;
		if (!ctx.hasUI) return { cancel: true };

		// Allow programmatic reloads / background transitions
		if (event.reason === "reload") return;

		const action =
			event.reason === "quit" ? "quit pi" :
			event.reason === "new" ? "start a new session" :
			event.reason === "resume" ? "switch sessions" :
			event.reason === "fork" ? "fork" :
			"exit";

		const choice = await ctx.ui.select(
			"\u26A0 " + guardMessage(pending) + "\n\n" + action + " anyway?",
			["No, stay here", "Yes, discard tasks"],
		);

		if (choice !== "Yes, discard tasks") {
			ctx.ui.notify("Cancelled " + action + " \u2014 complete pending tasks first or use /till-done done to override", "warning");
			return { cancel: true };
		}
	});

	// ─── User command — /till-done ────────────────────────────────────
	pi.registerCommand("till-done", {
		description: "Show task board. Subcommands: approve, done, clear. Use alone to view.",
		handler: async (args, ctx) => {
			const sub = args?.trim().toLowerCase();

			if (!ctx.hasUI) {
				// Non-interactive: print summary
				if (tasks.length === 0) {
					ctx.ui.notify("No tasks.", "info");
					return;
				}
				for (const t of tasks) {
					const status = t.proposed ? "p" : (t.done ? "x" : " ");
					ctx.ui.notify("  [" + status + "] #" + t.id + ": " + t.text, "info");
				}
				return;
			}

			if (sub === "approve") {
				const proposed = tasks.filter((t) => t.proposed);
				if (proposed.length === 0) {
					ctx.ui.notify("No proposed tasks to approve.", "info");
					return;
				}
				const list = proposed.map((t) => "  #" + t.id + ": " + t.text).join("\n");
				const confirmed = await ctx.ui.confirm(
					"Approve Plan?",
					"Activate " + proposed.length + " proposed task(s)? They will block exit until completed.\n\n" + list,
				);
				if (confirmed) {
					for (const t of tasks) {
						if (t.proposed) t.proposed = false;
					}
					updateUI(ctx);
					ctx.ui.notify("\u2713 Approved " + proposed.length + " task(s) \u2014 they now block exit", "success");
				}
				return;
			}

			if (sub === "done") {
				const pending = activePendingCount();
				if (pending === 0) {
					ctx.ui.notify("All active tasks already complete!", "info");
					return;
				}
				const confirmed = await ctx.ui.confirm(
					"Override all tasks?",
					"Mark all " + pending + " pending active task(s) as done? This bypasses the gate.",
				);
				if (confirmed) {
					for (const t of tasks) {
						if (!t.proposed) t.done = true;
					}
					updateUI(ctx);
					ctx.ui.notify("\u2713 All " + activeTotalCount() + " active tasks marked done", "success");
				}
				return;
			}

			if (sub === "clear") {
				if (tasks.length === 0) {
					ctx.ui.notify("No tasks to clear.", "info");
					return;
				}
				const confirmed = await ctx.ui.confirm(
					"Clear all tasks?",
					"Remove all " + tasks.length + " task(s)? This cannot be undone.",
				);
				if (confirmed) {
					tasks = [];
					nextId = 1;
					updateUI(ctx);
					ctx.ui.notify("Cleared all tasks", "info");
				}
				return;
			}

			// Show interactive task board
			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				const component = new TillDoneComponent(tasks, theme, () => done());
				return {
					render: (w: number) => component.render(w),
					handleInput: (data: string) => component.handleInput(data),
					invalidate: () => component.invalidate(),
				};
			});
		},
	});

	// ─── Tool to let the LLM view the gate status ────────────────────
	pi.registerTool({
		name: "till_done_status",
		label: "Till Done Status",
		description: "Check till-done task status. Shows proposed vs approved tasks, and whether tasks block exit.",
		parameters: Type.Object({}),
		promptSnippet: "Check remaining till-done tasks",
		promptGuidelines: [
			"Use till_done_status to check how many tasks remain before the user can finish.",
			"If tasks remain, work on completing them. Toggle each to done as you finish it.",
		],

		async execute() {
			const proposed = tasks.filter((t) => t.proposed);
			const activePending = activePendingCount();
			const activeTotal = activeTotalCount();
			const total = totalCount();

			if (total === 0) {
				return {
					content: [{ type: "text", text: "No till-done tasks. Nothing blocking exit." }],
					details: { pending: 0, total: 0, tasks: [] },
				};
			}

			const taskList = tasks.map((t) => {
				const prefix = t.proposed ? "p" : (t.done ? "x" : " ");
				return "[" + prefix + "] #" + t.id + ": " + t.text + (t.proposed ? " (proposed)" : "");
			}).join("\n");

			let status: string;
			if (proposed.length > 0) {
				status = "\u26A0 " + proposed.length + " task(s) proposed but not yet approved. "
					+ "They do NOT block exit yet. Use plan_task approve to ask the user.";
			} else if (activePending > 0) {
				const pct = Math.round(((activeTotal - activePending) / activeTotal) * 100);
				status = "\u26A0 " + activePending + " of " + activeTotal + " active tasks pending (" + pct + "% done). "
					+ "These tasks block session exit until completed or overridden.";
			} else {
				status = "\u2713 All " + activeTotal + " active tasks complete! Nothing blocking exit.";
			}

			return {
				content: [{ type: "text", text: status + "\n\n" + taskList }],
				details: { proposed: proposed.length, activePending, activeTotal, tasks: [...tasks] },
			};
		},
	});
}