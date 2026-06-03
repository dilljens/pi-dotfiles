/**
 * sudo-gate — Sudo password handling for AI agents
 *
 * Combines two industry-best approaches:
 *
 *   #2  "Global timestamp + poll" — if sudo is already cached (sudo -n true),
 *        the command runs without any dialog. If not cached, offers to poll
 *        for 30s while you run "sudo -v" in your terminal.
 *
 *   #3  "Masked password prompt" — enter your password in a secure TUI input
 *        that pipes directly to sudo's stdin. Password never touches the AI.
 *
 * Flow:
 *   1. sudo detected in bash command
 *   2. Check: are credentials already cached? → YES → run immediately
 *   3. NO → choice: [Enter password] [Wait for sudo -v] [Cancel]
 *
 * The password is piped directly to `sudo -S -v` via execSync.
 * It is NEVER sent to the LLM or included in any tool output.
 *
 * Place: ~/.pi/agent/extensions/sudo-gate.ts
 * Reload: /reload
 */

import { execSync } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

const SUDO_PATTERN = /\bsudo\b/i;

// ── helpers ──────────────────────────────────────────────────────────

function sudoCached(): boolean {
	try {
		execSync("sudo -n true 2>/dev/null", { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

function preAuthSudo(password: string): { ok: true } | { ok: false; error: string } {
	try {
		execSync("sudo -S -v", {
			input: password + "\n",
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 30_000,
		});
		return { ok: true };
	} catch (err: any) {
		const stderr = err.stderr?.toString() || "";
		const stdout = err.stdout?.toString() || "";
		return { ok: false, error: stderr.trim() || stdout.trim() || "authentication failed" };
	}
}



// ── password dialog (#3) ─────────────────────────────────────────────

async function showPasswordDialog(ctx: { hasUI: boolean; ui: any }): Promise<string | null> {
	if (!ctx.hasUI) return null;

	return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
		let password = "";
		let cursorPos = 0;

		function refresh() {
			tui.requestRender();
		}

		function handleInput(data: string): void {
			if (matchesKey(data, Key.enter)) {
				if (password.length > 0) done(password);
				return;
			}
			if (matchesKey(data, Key.escape)) {
				done(null);
				return;
			}
			if (matchesKey(data, Key.backspace)) {
				if (cursorPos > 0) {
					password = password.slice(0, cursorPos - 1) + password.slice(cursorPos);
					cursorPos--;
				}
				refresh();
				return;
			}
			if (matchesKey(data, Key.delete)) {
				if (cursorPos < password.length) {
					password = password.slice(0, cursorPos) + password.slice(cursorPos + 1);
				}
				refresh();
				return;
			}
			if (data === "\x15") {
				password = "";
				cursorPos = 0;
				refresh();
				return;
			} // Ctrl+U
			if (data === "\x01") {
				cursorPos = 0;
				refresh();
				return;
			} // Ctrl+A
			if (data === "\x05") {
				cursorPos = password.length;
				refresh();
				return;
			} // Ctrl+E
			if (matchesKey(data, Key.left)) {
				if (cursorPos > 0) cursorPos--;
				refresh();
				return;
			}
			if (matchesKey(data, Key.right)) {
				if (cursorPos < password.length) cursorPos++;
				refresh();
				return;
			}
			if (matchesKey(data, Key.home)) {
				cursorPos = 0;
				refresh();
				return;
			}
			if (matchesKey(data, Key.end)) {
				cursorPos = password.length;
				refresh();
				return;
			}

			if (data.length === 1 && data.charCodeAt(0) >= 0x20 && data.charCodeAt(0) <= 0x7e) {
				password = password.slice(0, cursorPos) + data + password.slice(cursorPos);
				cursorPos++;
				refresh();
			}
		}

		function render(width: number): string[] {
			const displayWidth = Math.min(width - 4, 60);
			const lines: string[] = [];
			const add = (s: string) => lines.push(truncateToWidth(s, width));

			add(theme.fg("accent", "─".repeat(width)));
			add("");
			add(theme.fg("text", " 🔐 enter sudo password"));
			add(theme.fg("dim", "   Piped directly to sudo. Never seen by the AI."));
			add("");

			const masked = "•".repeat(password.length);
			const visibleStart = Math.max(0, cursorPos - displayWidth + 1);
			const visibleMasked = masked.slice(visibleStart, visibleStart + displayWidth);
			const padded = visibleMasked.padEnd(displayWidth, " ");
			const cursorInVisible = cursorPos - visibleStart;

			let displayLine = " ║ ";
			if (password.length === 0) {
				displayLine += theme.inverse(" ");
			} else if (cursorPos >= password.length) {
				displayLine += theme.fg("dim", padded) + theme.inverse(" ");
			} else if (cursorInVisible >= 0 && cursorInVisible < padded.length) {
				const before = padded.slice(0, cursorInVisible);
				const at = padded[cursorInVisible];
				const after = padded.slice(cursorInVisible + 1);
				displayLine += theme.fg("dim", before) + theme.inverse(at) + theme.fg("dim", after);
			} else {
				displayLine += theme.fg("dim", padded);
			}
			displayLine += " ║";
			add(displayLine);

			add("");
			add(theme.fg("dim", "   Enter: submit  •  Esc: cancel  •  Ctrl+U: clear"));
			add(theme.fg("accent", "─".repeat(width)));

			return lines;
		}

		return { render, invalidate: () => {}, handleInput };
	});
}



// ── main extension ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = event.input.command as string;
		if (!SUDO_PATTERN.test(command)) return undefined;

		// ── #2: creds already cached? → let command through immediately ──
		if (sudoCached()) return undefined;

		// ── need credentials ─────────────────────────────────────────
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: "sudo credentials not cached. Run 'sudo -v' in a terminal or reload pi with TUI.",
			};
		}

		// ── go straight to masked password prompt ───────────────────
		const password = await showPasswordDialog(ctx);

		if (password === null) {
			return { block: true, reason: "User cancelled password entry" };
		}
		if (password.length === 0) {
			return { block: true, reason: "No password entered" };
		}

		const result = preAuthSudo(password);
		if (!result.ok) {
			return { block: true, reason: `sudo authentication failed: ${result.error}` };
		}

		ctx.ui.notify("sudo authenticated ✓", "info");
		return undefined;
	});
}
