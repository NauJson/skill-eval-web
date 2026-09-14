import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export function hasRealCodex(): boolean {
  const res = spawnSync("which", ["codex"], { encoding: "utf8" });
  return res.status === 0 && !!res.stdout?.trim();
}

export interface ExecResult {
  ok: boolean;
  exitCode: number;
  stderr: string;
  usedMock: boolean;
}

export function executePrompt(opts: {
  prompt: string;
  jsonlPath: string;
  cwd?: string;
  fullAuto?: boolean;
}): ExecResult {
  const { prompt, jsonlPath, cwd = process.cwd(), fullAuto = true } = opts;
  mkdirSync(path.dirname(jsonlPath), { recursive: true });

  if (hasRealCodex()) {
    return runRealCodex({ prompt, jsonlPath, cwd, fullAuto });
  }
  return runMockCodex({ prompt, jsonlPath, cwd });
}

function runRealCodex(opts: {
  prompt: string;
  jsonlPath: string;
  cwd: string;
  fullAuto: boolean;
}): ExecResult {
  const args = ["exec", "--json"];
  if (opts.fullAuto) args.push("--full-auto");
  args.push(opts.prompt);

  const res = spawnSync("codex", args, {
    cwd: opts.cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  writeFileSync(opts.jsonlPath, res.stdout || "", "utf8");

  return {
    ok: res.status === 0,
    exitCode: res.status ?? 1,
    stderr: res.stderr || "",
    usedMock: false,
  };
}

function runMockCodex(opts: {
  prompt: string;
  jsonlPath: string;
  cwd: string;
}): ExecResult {
  const prompt = opts.prompt.toLowerCase();
  const shouldTrigger =
    opts.prompt.includes("$setup-demo-app") ||
    prompt.includes("demo app") ||
    (prompt.includes("react") && prompt.includes("tailwind"));

  const isNegative =
    prompt.includes("existing") ||
    prompt.includes("add tailwind styling to my existing");

  const events: Record<string, unknown>[] = [
    { type: "turn.started", timestamp: new Date().toISOString() },
  ];

  if (shouldTrigger && !isNegative) {
    const cmds = [
      "npm create vite@latest demo-app -- --template react-ts",
      "cd demo-app && npm install",
      "npm install tailwindcss @tailwindcss/vite",
    ];
    for (const command of cmds) {
      events.push({
        type: "item.started",
        item: { type: "command_execution", command },
      });
      events.push({
        type: "item.completed",
        item: { type: "command_execution", command, exit_code: 0 },
      });
    }

    try {
      const demoDir = path.join(opts.cwd, "demo-app");
      mkdirSync(demoDir, { recursive: true });
      writeFileSync(
        path.join(demoDir, "package.json"),
        JSON.stringify({ name: "demo-app", private: true, version: "0.0.0" }, null, 2),
        "utf8"
      );
    } catch {
      // ignore
    }
  } else if (isNegative) {
    events.push({
      type: "message",
      role: "assistant",
      content: "I will add Tailwind to your existing project instead of scaffolding a new one.",
    });
  } else {
    events.push({
      type: "message",
      role: "assistant",
      content: "No matching skill found for this request.",
    });
  }

  events.push({
    type: "turn.completed",
    usage: { input_tokens: 1200, output_tokens: 350 },
  });

  const jsonl = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(opts.jsonlPath, jsonl, "utf8");

  return {
    ok: true,
    exitCode: 0,
    stderr: "[mock] codex binary not found – used deterministic mock executor",
    usedMock: true,
  };
}

export function parseJsonl(text: string): Record<string, unknown>[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return { type: "parse_error", raw: line };
      }
    });
}
