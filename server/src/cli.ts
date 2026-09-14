#!/usr/bin/env node
import { listSkills } from "./loader.js";
import { runSkill } from "./runner.js";

const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  if (!cmd || cmd === "help") {
    console.log(`
Usage:
  npx tsx server/src/cli.ts list
  npx tsx server/src/cli.ts run <skill> [--tag <tag>] [--only id1,id2]
`);
    return;
  }

  if (cmd === "list") {
    const skills = listSkills();
    console.log("\nAvailable skills:\n");
    for (const s of skills) {
      console.log(`  • ${s.name}  (${s.promptCount} prompts)  ${s.description || ""}`);
    }
    console.log("");
    return;
  }

  if (cmd === "run") {
    const skill = args[1];
    if (!skill) {
      console.error("Please specify a skill name");
      process.exit(1);
    }
    let tag: string | undefined;
    let only: string[] | undefined;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--tag") tag = args[++i];
      if (args[i] === "--only") only = (args[++i] || "").split(",").map((s) => s.trim());
    }
    const report = await runSkill(skill, { tag, only });
    console.log(`\nPass rate: ${report.summary.passed}/${report.summary.total}`);
    for (const r of report.results) {
      console.log(`${r.passed ? "✅" : "❌"} ${r.prompt_id}`);
    }
    if (report.summary.failed > 0) process.exit(1);
    return;
  }

  console.error("Unknown command");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
