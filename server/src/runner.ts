import { readFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { loadPrompts } from "./loader.js";
import { executePrompt, parseJsonl } from "./executor.js";
import { runDeterministicChecks } from "./checks.js";
import { ARTIFACTS_DIR, REPORTS_DIR } from "./paths.js";
import type { RunReport, PromptResult } from "./types.js";
import { writeFileSync } from "node:fs";

function makeRunId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export interface RunOptions {
  only?: string[];
  tag?: string;
}

export async function runSkill(
  skillName: string,
  opts: RunOptions = {}
): Promise<RunReport> {
  const prompts = loadPrompts(skillName);
  let selected = prompts;

  if (opts.only?.length) {
    selected = prompts.filter((p) => opts.only!.includes(p.id));
  }
  if (opts.tag) {
    selected = selected.filter((p) =>
      (p.tags || "").split(/[, ]+/).includes(opts.tag!)
    );
  }

  if (selected.length === 0) {
    throw new Error(`No prompts selected for skill "${skillName}"`);
  }

  const runId = makeRunId();
  const runDir = path.join(ARTIFACTS_DIR, runId);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const results: PromptResult[] = [];

  for (const row of selected) {
    const jsonlPath = path.join(runDir, `${row.id}.jsonl`);

    try {
      const execResult = executePrompt({
        prompt: row.prompt,
        jsonlPath,
        cwd: process.cwd(),
        fullAuto: true,
      });

      const events = parseJsonl(readFileSync(jsonlPath, "utf8"));
      const detResults = runDeterministicChecks({
        events,
        projectDir: process.cwd(),
        promptRow: row,
      });

      results.push({
        prompt_id: row.id,
        passed: detResults.every((c) => c.pass),
        deterministic: detResults,
        artifacts: {
          jsonl: jsonlPath,
          usedMock: execResult.usedMock,
        },
      });
    } catch (err) {
      results.push({
        prompt_id: row.id,
        passed: false,
        deterministic: [],
        artifacts: { jsonl: jsonlPath, usedMock: true },
        error: String(err),
      });
    }
  }

  const finishedAt = new Date().toISOString();
  const passedCount = results.filter((r) => r.passed).length;

  const report: RunReport = {
    run_id: runId,
    skill: skillName,
    started_at: startedAt,
    finished_at: finishedAt,
    results,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      pass_rate: results.length ? passedCount / results.length : 0,
    },
  };

  const reportPath = path.join(REPORTS_DIR, `${runId}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  return report;
}

export function listReports(): { run_id: string; skill: string; pass_rate: number; started_at: string }[] {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const raw = JSON.parse(readFileSync(path.join(REPORTS_DIR, f), "utf8")) as RunReport;
        return {
          run_id: raw.run_id,
          skill: raw.skill,
          pass_rate: raw.summary.pass_rate,
          started_at: raw.started_at,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b!.started_at > a!.started_at ? 1 : -1)) as any;
}

export function getReport(runId: string): RunReport | null {
  const p = path.join(REPORTS_DIR, `${runId}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as RunReport;
}
