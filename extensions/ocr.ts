/**
 * OCR Capture Extension
 *
 * Captures a screen region and OCRs it. Requires KDE Plasma (spectacle).
 *
 * Prerequisites (Arch/CachyOS):
 *   paru -S spectacle tesseract tesseract-data-eng wl-clipboard
 *
 * Usage:
 *   /ocr            Capture a region with the mouse, OCR it, send as user message
 *   /ocr deu        Same with German language
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REQUIRED_TOOLS = ["tesseract"] as const;

async function checkTools(pi: ExtensionAPI): Promise<string[]> {
	const missing: string[] = [];
	for (const tool of REQUIRED_TOOLS) {
		const result = await pi.exec("which", [tool]);
		if (result.code !== 0) missing.push(tool);
	}
	return missing;
}

/** Use spectacle (KDE) with its own region selector + temp file + tesseract. */
async function trySpectacle(
	pi: ExtensionAPI,
	language: string,
): Promise<string> {
	const hasSpectacle = await pi
		.exec("which", ["spectacle"])
		.then((r) => r.code === 0);
	if (!hasSpectacle) {
		throw new Error(
			"No working screen capture tool found. Install spectacle (KDE).",
		);
	}

	const tmpFile = `/tmp/ocr-${Date.now()}.png`;

	const capResult = await pi.exec("spectacle", [
		"--region",
		"--background",
		"--output",
		tmpFile,
		"--nonotify",
	]);

	if (capResult.code !== 0) {
		throw new Error(`Capture cancelled or failed: ${capResult.stderr || capResult.stdout || "unknown"}`);
	}

	const ocrResult = await pi.exec("bash", [
		"-c",
		`tesseract "${tmpFile}" stdout -l ${language} 2>/dev/null; rm -f "${tmpFile}"`,
	]);

	if (ocrResult.code !== 0) {
		throw new Error(`OCR failed: ${ocrResult.stderr || "unknown error"}`);
	}

	const text = ocrResult.stdout.trim();
	if (!text) throw new Error("No text detected in the selected region");
	return text;
}

async function captureAndOcr(
	pi: ExtensionAPI,
	language: string,
): Promise<string> {
	return await trySpectacle(pi, language);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("ocr", {
		description:
			"OCR a screen region selected with the mouse. Usage: /ocr [language]",
		handler: async (args, ctx) => {
			const missing = await checkTools(pi);
			if (missing.length > 0) {
				ctx.ui.notify(
					`Missing tools: ${missing.join(", ")}. Install with: paru -S spectacle tesseract tesseract-data-eng`,
					"error",
				);
				return;
			}

			const language = args.trim() || "eng";

			try {
				ctx.ui.notify("Select a screen region with the mouse...", "info");

				const text = await captureAndOcr(pi, language);

				// Copy result to clipboard
				await pi.exec("bash", [
					"-c",
					`wl-copy <<< "${text.replace(/"/g, '\\"')}"`,
				]);

				// Pre-fill the input so the user can review/edit before sending
				ctx.ui.setEditorText(text);

				ctx.ui.notify(
					`OCR'd ${text.length} chars → clipboard + input area`,
					"info",
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				ctx.ui.notify(message, "error");
			}
		},
	});
}
