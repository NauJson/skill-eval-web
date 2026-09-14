import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { SKILLS_DIR, PROMPTS_DIR } from "./paths.js";
import type { PromptRow, SkillInfo } from "./types.js";

export function listSkills(): SkillInfo[] {
  if (!existsSync(SKILLS_DIR)) return [];

  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const skillMd = path.join(SKILLS_DIR, d.name, "SKILL.md");
      const hasSkillMd = existsSync(skillMd);
      let description = "";
      let promptCount = 0;

      if (hasSkillMd) {
        const content = readFileSync(skillMd, "utf8");
        const match = content.match(/^description:\s*(.+)$/m);
        if (match) description = match[1].trim();
      }

      try {
        promptCount = loadPrompts(d.name).length;
      } catch {
        // no prompts yet
      }

      return {
        name: d.name,
        promptCount,
        hasSkillMd,
        description,
      };
    });
}

export function loadSkillContent(skillName: string): string {
  const p = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!existsSync(p)) throw new Error(`Skill not found: ${skillName}`);
  return readFileSync(p, "utf8");
}

export function loadPrompts(skillName: string): PromptRow[] {
  const csvPath = path.join(PROMPTS_DIR, `${skillName}.csv`);
  if (!existsSync(csvPath)) {
    throw new Error(`Prompts file not found: ${csvPath}`);
  }

  const text = readFileSync(csvPath, "utf8").trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: PromptRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });

    rows.push({
      id: row.id || `row-${i}`,
      should_trigger: (row.should_trigger || "").toLowerCase() === "true",
      prompt: row.prompt || "",
      tags: row.tags || "",
    });
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}
