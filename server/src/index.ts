import express from "express";
import cors from "cors";
import { listSkills, loadSkillContent, loadPrompts } from "./loader.js";
import { runSkill, listReports, getReport } from "./runner.js";
import { hasRealCodex } from "./executor.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasCodex: hasRealCodex(),
    time: new Date().toISOString(),
  });
});

app.get("/api/skills", (_req, res) => {
  try {
    res.json(listSkills());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/skills/:name", (req, res) => {
  try {
    const content = loadSkillContent(req.params.name);
    const prompts = loadPrompts(req.params.name);
    res.json({ name: req.params.name, content, prompts });
  } catch (err) {
    res.status(404).json({ error: String(err) });
  }
});

app.get("/api/skills/:name/prompts", (req, res) => {
  try {
    res.json(loadPrompts(req.params.name));
  } catch (err) {
    res.status(404).json({ error: String(err) });
  }
});

app.post("/api/skills/:name/run", async (req, res) => {
  try {
    const { only, tag } = req.body || {};
    const report = await runSkill(req.params.name, { only, tag });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/reports", (_req, res) => {
  try {
    res.json(listReports());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/reports/:runId", (req, res) => {
  const report = getReport(req.params.runId);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`\n  Skill Eval API running at http://localhost:${PORT}`);
  console.log(`  Codex available: ${hasRealCodex() ? "yes" : "no (using mock)"}\n`);
});
