import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Project root (skill-eval-web/) */
export const ROOT = path.resolve(__dirname, "../..");

export const SKILLS_DIR = path.join(ROOT, "skills");
export const PROMPTS_DIR = path.join(ROOT, "evals", "prompts");
export const CHECKS_DIR = path.join(ROOT, "evals", "checks");
export const ARTIFACTS_DIR = path.join(ROOT, "evals", "artifacts");
export const REPORTS_DIR = path.join(ROOT, "evals", "reports");
