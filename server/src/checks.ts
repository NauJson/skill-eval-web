import { existsSync } from "node:fs";
import path from "node:path";
import type { CheckResult, PromptRow } from "./types.js";

export function runDeterministicChecks(ctx: {
  events: Record<string, unknown>[];
  projectDir: string;
  promptRow: PromptRow;
}): CheckResult[] {
  const { events, projectDir, promptRow } = ctx;
  const results: CheckResult[] = [];
  const shouldTrigger = promptRow.should_trigger;

  const triggered = events.some((e) => {
    const t = e.type as string;
    return t === "item.started" || t === "item.completed" || !!(e.item as any)?.type;
  });

  results.push({
    id: "skill_triggered",
    pass: shouldTrigger ? triggered : !triggered,
    message: shouldTrigger
      ? triggered
        ? "Skill appears to have been invoked"
        : "Expected skill to trigger but no relevant events found"
      : triggered
        ? "Skill triggered unexpectedly (false positive)"
        : "Correctly did not trigger skill",
    evidence: { eventCount: events.length },
  });

  if (shouldTrigger) {
    const ranNpmInstall = events.some((e) => {
      const item = e.item as { type?: string; command?: string } | undefined;
      return (
        (e.type === "item.started" || e.type === "item.completed") &&
        item?.type === "command_execution" &&
        typeof item.command === "string" &&
        item.command.includes("npm install")
      );
    });

    results.push({
      id: "ran_npm_install",
      pass: ranNpmInstall,
      message: ranNpmInstall
        ? "Found npm install command in trace"
        : "npm install was not executed",
      evidence: events
        .filter((e) => (e.item as any)?.type === "command_execution")
        .map((e) => (e.item as any)?.command),
    });

    const pkgPath = path.join(projectDir, "demo-app", "package.json");
    const hasPkg = existsSync(pkgPath);
    results.push({
      id: "has_package_json",
      pass: hasPkg,
      message: hasPkg
        ? "package.json found under demo-app/"
        : "package.json not found under demo-app/",
      evidence: { checked: [pkgPath] },
    });
  }

  const hasError = events.some((e) => {
    const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
    return e.type === "error" || msg.includes("error");
  });

  results.push({
    id: "no_crash",
    pass: !hasError,
    message: hasError ? "Error-like events detected in trace" : "No obvious crash markers",
  });

  return results;
}
