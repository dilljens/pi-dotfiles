import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync, spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import path from "node:path";

// ── Tool schema ──────────────────────────────────────────────────────────────

const sgSchema = Type.Object({
  pattern: Type.String({
    description:
      "AST pattern to search for. Uses tree-sitter pattern syntax where $A, $B, etc. are wildcards matching any AST node, $$$ matches zero-or-more nodes, '$$$' matches any string. Write patterns as code snippets, e.g. 'console.log($A)' finds all console.log calls with one argument, 'if ($A) { $$$ }' finds if-blocks, 'function $NAME($$$) { $$$ }' finds function declarations.",
  }),
  path: Type.Optional(
    Type.String({
      description: "Directory or file to search (default: current directory)",
    }),
  ),
  lang: Type.Optional(
    Type.String({
      description:
        "Programming language of the pattern. Required for accurate AST matching. Supported: typescript, javascript, python, rust, go, java, ruby, c, cpp, css, html, json, bash, sql, and more. Auto-detected from file extensions when possible.",
    }),
  ),
  glob: Type.Optional(
    Type.String({
      description:
        "Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'",
    }),
  ),
  context: Type.Optional(
    Type.Number({
      description:
        "Number of lines to show before and after each match (default: 0)",
    }),
  ),
  limit: Type.Optional(
    Type.Number({
      description: "Maximum number of matches to return (default: 100)",
    }),
  ),
  raw: Type.Optional(
    Type.Boolean({
      description:
        "When true, treat pattern as a raw tree-sitter query (sexpr) instead of AST pattern syntax (default: false)",
    }),
  ),
});

const DEFAULT_LIMIT = 100;

// ── File extension → language mapping ────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  mts: "typescript",
  cts: "typescript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  rb: "ruby",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  cs: "c-sharp",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  json: "json",
  xml: "xml",
  php: "php",
  r: "r",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  dart: "dart",
  lua: "lua",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  elm: "elm",
  erl: "erlang",
  hrl: "erlang",
  ex: "elixir",
  exs: "elixir",
  sql: "sql",
  vue: "vue",
  svelte: "svelte",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  proto: "protobuf",
  zig: "zig",
  prisma: "prisma",
  graphql: "graphql",
  gql: "graphql",
  terraform: "hcl",
  tf: "hcl",
};

// ── Resolve `sg` binary ──────────────────────────────────────────────────────

function findSg(): string | null {
  // Try PATH first — verify it's actually ast-grep, not the group-management tool
  try {
    const out = execSync("sg --version 2>&1", { encoding: "utf-8" });
    if (out.toLowerCase().includes("ast-grep")) return "sg";
  } catch {
    // not in PATH in a usable way
  }

  // Check fnm-managed node global bins
  const home = process.env.HOME;
  if (home) {
    const fnmBase = `${home}/.local/share/fnm`;
    try {
      const bins = execSync(
        `find "${fnmBase}" -path "*/node_modules/.bin/sg" -type f 2>/dev/null`,
        { encoding: "utf-8" },
      )
        .trim()
        .split("\n")
        .filter(Boolean);
      if (bins.length > 0) {
        const out = execSync(`${bins[0]} --version 2>&1`, { encoding: "utf-8" });
        if (out.toLowerCase().includes("ast-grep")) return bins[0];
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// ── Guess language from file path ────────────────────────────────────────────

function guessLang(filePath: string): string | undefined {
  const ext = path.extname(filePath).replace(/^\./, "");
  return EXT_TO_LANG[ext];
}

// ── Tool implementation ──────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const sgPath = findSg();

  pi.registerTool({
    name: "sg",
    label: "sg",
    description: `PREFERRED tool for searching code. Uses AST-level pattern matching (ast-grep) instead of regex — understands code structure, handles multi-line patterns, and ignores formatting.

Use sg for ALL code searches. Use grep (regex) only for truly text-based searches where AST patterns don't apply.

Key syntax — write code patterns with meta-variables:
  • $A, $B, $META — match any single AST node (like a wildcard for any expression/statement)
  • $$$           — match zero or more AST nodes (e.g. all function arguments, all statements in a block)
  • '$$$'         — match any string content inside quotes

Examples:
  "console.log($A)"                        → all console.log calls with one arg
  "if ($A) { $$$ }"                        → all if-statements
  "function $NAME($$$) { $$$ }"            → any function declaration
  "import { $$$ } from 'react'"            → react imports
  "$A.method()"                            → any method call (expression.method())
  "await $A($$$)"                          → any awaited function call
  "try { $$$ } catch ($ERR) { $$$ }"       → try/catch blocks
  "export class $NAME { $$$ }"             → exported classes
  "$A = $B ?? $C"                          → nullish coalescing assignments
  "async function $NAME($$$) { $$$ }"      → async functions
  "const $NAME = ($$$) => { $$$ }"         → arrow function assigned to const

Output is truncated to ${DEFAULT_LIMIT} matches. Uses ast-grep (sg) for structural code search — respects .gitignore, handles multi-line patterns naturally.`,
    promptSnippet: "Search code with AST structural patterns (preferred over grep for code)",
    parameters: sgSchema,
    async execute(
      _toolCallId: string,
      params: {
        pattern: string;
        path?: string;
        lang?: string;
        glob?: string;
        context?: number;
        limit?: number;
        raw?: boolean;
      },
      signal: AbortSignal | undefined,
      _onUpdate: unknown,
      _ctx: unknown,
    ): Promise<{
      content: Array<{ type: "text"; text: string }>;
      details?: Record<string, unknown>;
    }> {
      const sg = sgPath || findSg();
      if (!sg) {
        return {
          content: [
            {
              type: "text" as const,
              text: "ast-grep (sg) is not installed. Install it with: npm install -g @ast-grep/cli",
            },
          ],
          details: { isError: true },
        };
      }

      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error("Operation aborted"));
          return;
        }

        let settled = false;
        const settle = (fn: () => void) => {
          if (!settled) {
            settled = true;
            fn();
          }
        };

        try {
          const searchDir = params.path || ".";
          const effectiveLimit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
          const contextValue =
            params.context && params.context > 0 ? params.context : 0;

          // Build sg command
          const sgArgs = [
            "run",
            "--json=stream",
            "--color=never",
            // Search hidden files (dotfiles) but still respect .gitignore
            "--no-ignore=hidden",
          ];

          if (params.lang) {
            sgArgs.push("-l", params.lang);
          } else {
            // Auto-detect lang from glob or path
            if (params.glob) {
              // Extract extension from glob like "*.ts" or "**/*.spec.ts"
              const m = params.glob.match(/\*\.(\w+)$/);
              const ext = m?.[1];
              if (ext && EXT_TO_LANG[ext]) {
                sgArgs.push("-l", EXT_TO_LANG[ext]);
              }
            } else if (searchDir !== "." && !searchDir.includes("*")) {
              const guessed = guessLang(searchDir);
              if (guessed) sgArgs.push("-l", guessed);
            }
          }

          if (params.glob) {
            sgArgs.push("--globs", params.glob);
          }
          if (contextValue > 0) {
            sgArgs.push("-C", String(contextValue));
          }
          if (params.raw) {
            sgArgs.push("--debug-query=sexp");
          }

          sgArgs.push("-p", params.pattern, "--", searchDir);

          const child = spawn(sg, sgArgs, {
            stdio: ["ignore", "pipe", "pipe"],
          });

          let matchCount = 0;
          let matchLimitReached = false;
          let aborted = false;
          let killedDueToLimit = false;
          const results: Array<{ text: string }> = [];

          const cleanup = () => {
            signal?.removeEventListener("abort", onAbort);
            child.stdout?.removeAllListeners();
            child.stderr?.removeAllListeners();
          };

          const stopChild = (dueToLimit = false) => {
            if (!child.killed) {
              killedDueToLimit = dueToLimit;
              child.kill();
            }
          };

          const onAbort = () => {
            aborted = true;
            stopChild();
          };
          signal?.addEventListener("abort", onAbort, { once: true });

          let buffer = "";
          const jsonLines: string[] = [];

          child.stdout?.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                JSON.parse(line); // validate it's JSON
                if (matchCount >= effectiveLimit) {
                  if (!matchLimitReached) {
                    matchLimitReached = true;
                    stopChild(true);
                  }
                  continue;
                }
                matchCount++;
                jsonLines.push(line);
              } catch {
                jsonLines.push(line);
              }
            }
          });

          let stderr = "";
          child.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
          });

          child.on("error", (error: Error) => {
            cleanup();
            settle(() =>
              reject(new Error(`Failed to run ast-grep: ${error.message}`)),
            );
          });

          child.on("close", async (code: number | null) => {
            cleanup();

            // Flush remaining buffer
            if (buffer.trim()) {
              try {
                JSON.parse(buffer);
                jsonLines.push(buffer);
              } catch {
                jsonLines.push(buffer);
              }
            }

            if (aborted) {
              settle(() => reject(new Error("Operation aborted")));
              return;
            }

            const hadMatches = matchCount > 0;

            // sg exit code 1 = no matches (not an error)
            if (code !== null && code !== 0 && code !== 1) {
              const errorMsg = stderr.trim() || `ast-grep exited with code ${code}`;
              settle(() => reject(new Error(errorMsg)));
              return;
            }

            if (!hadMatches) {
              settle(() =>
                resolve({
                  content: [{ type: "text" as const, text: "No matches found" }],
                  details: undefined,
                }),
              );
              return;
            }

            // Parse JSON stream results
            for (const rawLine of jsonLines) {
              try {
                const parsed = JSON.parse(rawLine);
                // sg --json=stream produces lines like:
                // {"type":"match","file":"...","lines":{"text":"...","end":...},"range":{"start":{"line":...,"col":...}},...}
                // or {"type":"context","file":"...","lines":{...},"range":{...}}
                if (parsed.type === "context" && contextValue > 0) continue;

                const filePath = parsed.file || parsed.meta?.file || "";
                const lineNum =
                  parsed.range?.start?.line ??
                  parsed.start?.line ??
                  parsed.line ??
                  parsed.meta?.start?.line;
                const colNum =
                  parsed.range?.start?.col ??
                  parsed.range?.start?.column ??
                  parsed.start?.column ??
                  parsed.meta?.start?.column;
                const rawText =
                  parsed.text ??
                  parsed.lines?.text ??
                  parsed.content ??
                  parsed.meta?.text ??
                  "";

                // Make path relative to search directory for cleaner output
                const relativePath = filePath
                  ? path.relative(searchDir, filePath) || path.basename(filePath)
                  : "?";

                const cleanText = rawText.toString().replace(/\r?\n$/, "");
                const lineStr = lineNum ?? "?";
                const colStr = colNum != null ? `:${colNum}` : "";

                results.push({
                  text: `${relativePath}:${lineStr}${colStr}: ${cleanText}`,
                });
              } catch {
                // Non-JSON line (shouldn't happen with --json=stream, but be safe)
                if (rawLine.trim()) {
                  results.push({ text: rawLine });
                }
              }
            }

            const outputLines = results.map((r) => r.text);
            let output = outputLines.join("\n");
            const notices: string[] = [];

            if (matchLimitReached) {
              notices.push(
                `${effectiveLimit} matches limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`,
              );
            }

            if (notices.length > 0) {
              output += `\n\n[${notices.join(". ")}]`;
            }

            settle(() =>
              resolve({
                content: [{ type: "text" as const, text: output }],
                details: matchLimitReached
                  ? { matchLimitReached: effectiveLimit }
                  : undefined,
              }),
            );
          });
        } catch (err) {
          settle(() =>
            reject(err instanceof Error ? err : new Error(String(err))),
          );
        }
      });
    },
  });
}
