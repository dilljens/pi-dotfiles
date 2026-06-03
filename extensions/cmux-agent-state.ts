/**
 * cmux-agent-state — report pi agent state to the cmux sidebar
 *
 * When pi runs inside a cmux terminal, this extension sends state
 * updates over the cmux Unix socket ($CMUX_SOCKET) so the sidebar
 * shows the agent lifecycle:
 *
 *   working → done → idle → working → ...
 *
 *   working   agent is processing (blue ⚡ pill)
 *   done      agent finished, waiting for you (green ✅ pill)
 *   idle      you've engaged, no agent active (no pill)
 *   retrying  transient provider error, auto-retrying (orange ⚠️ pill)
 *
 * Protocol = same plain-text format as cmux-zsh-integration.zsh.
 * Pattern = herdr-agent-state's desiredState() + publishState() approach.
 */

import { createConnection } from "node:net";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ── Detect cmux ──────────────────────────────────────────────────────
const SOCKET = process.env.CMUX_SOCKET;

function enabled(): boolean {
  return !!SOCKET;
}

// ── Socket transport (fire-and-forget) ───────────────────────────────
const TARGET_FLAGS =
  (process.env.CMUX_WORKSPACE_ID
    ? ` --tab=${process.env.CMUX_WORKSPACE_ID}`
    : "") +
  (process.env.CMUX_PANEL_ID
    ? ` --panel=${process.env.CMUX_PANEL_ID}`
    : "");

function cmuxSend(command: string): void {
  if (!SOCKET) return;
  const conn = createConnection(SOCKET);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    conn.destroy();
  };
  conn.on("error", finish);
  conn.write(command + TARGET_FLAGS + "\n");
  conn.end();
  conn.on("close", finish);
  const timeout = setTimeout(finish, 500);
  timeout.unref?.();
}

// ── Retryable-error detection (herdr-adapted) ────────────────────────
const RETRY_PATTERN = /overloaded|rate\.?limit|too many requests|429|500|502|503|504|service\.?unavailable|server\.?error|internal\.?error|network\.?error|connection\.?error|connection\.?refused|connection\.?lost|websocket\.?closed|websocket\.?error|other side closed|fetch failed|upstream\.?connect|reset before headers|socket hang up|ended without|http2 request did not get a response|timed?\s?out|timeout|terminated|retry delay/i;

function lastAssistantMessage(messages: unknown[]): any | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as any;
    if (msg?.role === "assistant") return msg;
  }
  return undefined;
}

function retryableErrorMessage(event: any): string | undefined {
  const messages = Array.isArray(event?.messages) ? event.messages : [];
  const assistant = lastAssistantMessage(messages);
  if (assistant?.stopReason !== "error") return undefined;
  const errMsg = String(assistant.errorMessage ?? "");
  if (!RETRY_PATTERN.test(errMsg)) return undefined;
  return errMsg || "retryable provider error";
}

// ── Desired-state helper (herdr pattern) ────────────────────────────
type AgentPill = "working" | "done" | "idle" | "retrying";

// ── State machine ────────────────────────────────────────────────────
export default function (pi: ExtensionAPI) {
  if (!enabled()) return;

  // State flags
  let agentActive = false;
  let agentFinished = false; // agent just finished (→ done)
  let retryHoldActive = false;
  let userEngaged = false; // user sent input since last done
  let lastPill: AgentPill | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  /** Compute the desired pill from current flags. */
  function desiredPill(): AgentPill {
    if (retryHoldActive) return "retrying";
    if (agentActive) return "working";
    if (agentFinished && !userEngaged) return "done";
    return "idle";
  }

  /** Push the current desired-state to cmux, skipping no-op transitions. */
  function publishState() {
    const pill = desiredPill();
    if (pill === lastPill) return;
    lastPill = pill;

    switch (pill) {
      case "working":
        cmuxSend('set_status agent working --color=blue --icon=⚡');
        break;
      case "done":
        cmuxSend('set_status agent done --color=green --icon=✅');
        break;
      case "idle":
        cmuxSend("clear_status agent");
        cmuxSend("clear_progress");
        break;
      case "retrying":
        cmuxSend('set_status agent retrying --color=orange --icon=⚠️');
        break;
    }
  }

  // ── Transition helpers ──────────────────────────────────────────

  function goWorking(): void {
    clearTimer();
    agentActive = true;
    agentFinished = false;
    retryHoldActive = false;
    userEngaged = false;
    publishState();
  }

  function goDone(): void {
    agentActive = false;
    agentFinished = true;
    retryHoldActive = false;
    // userEngaged stays false until the user sends input
    publishState();
  }

  function goRetrying(): void {
    clearTimer();
    retryHoldActive = true;
    agentActive = false;
    publishState();
  }

  function goIdle(): void {
    // Called when user sends input while we're in done.
    // The user is engaging — clear the done pill to idle.
    userEngaged = true;
    agentFinished = false;
    publishState();
  }

  // ── pi lifecycle hooks ──────────────────────────────────────────

  pi.on("agent_start", () => {
    goWorking();
  });

  pi.on("agent_end", (event) => {
    agentActive = false;

    // Check for retryable error before settling into done.
    const retryMsg = retryableErrorMessage(event);
    if (retryMsg) {
      goRetrying();
      return;
    }

    goDone();
  });

  pi.on("input", () => {
    // User sent a message — if we were in done, show idle
    // to acknowledge engagement before agent_start fires.
    if (desiredPill() === "done") {
      goIdle();
    }
  });

  pi.on("session_shutdown", () => {
    clearTimer();
    agentActive = false;
    agentFinished = false;
    retryHoldActive = false;
    lastPill = undefined;
    cmuxSend("clear_status agent");
    cmuxSend("clear_progress");
  });
}
