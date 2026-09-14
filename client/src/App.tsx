import { useCallback, useEffect, useState } from "react";
import {
  api,
  type SkillInfo,
  type PromptRow,
  type RunReport,
  type ReportSummary,
} from "./api";

type View = "skills" | "run" | "reports" | "skill-detail";

export default function App() {
  const [view, setView] = useState<View>("skills");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [skillDetail, setSkillDetail] = useState<{ content: string; prompts: PromptRow[] } | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCodex, setHasCodex] = useState<boolean | null>(null);
  const [filterTag, setFilterTag] = useState("");

  const refreshSkills = useCallback(async () => {
    try {
      setSkills(await api.listSkills());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const refreshReports = useCallback(async () => {
    try {
      setReports(await api.listReports());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshSkills();
    refreshReports();
    api.health().then((h) => setHasCodex(h.hasCodex)).catch(() => setHasCodex(false));
  }, [refreshSkills, refreshReports]);

  async function openSkill(name: string) {
    setSelected(name);
    setError(null);
    try {
      const detail = await api.getSkill(name);
      setSkillDetail({ content: detail.content, prompts: detail.prompts });
      setView("skill-detail");
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleRun() {
    if (!selected) return;
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const body: { tag?: string } = {};
      if (filterTag) body.tag = filterTag;
      const result = await api.runSkill(selected, body);
      setReport(result);
      setView("run");
      refreshReports();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function openReport(runId: string) {
    try {
      const r = await api.getReport(runId);
      setReport(r);
      setSelected(r.skill);
      setView("run");
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">SE</div>
          <div>
            <div className="logo-text">Skill Eval</div>
            <div className="logo-sub">Harness</div>
          </div>
        </div>
        <nav className="nav-section">
          <div className="nav-label">Workspace</div>
          <button
            className={`nav-item ${view === "skills" || view === "skill-detail" ? "active" : ""}`}
            onClick={() => setView("skills")}
          >
            Skills
          </button>
          <button
            className={`nav-item ${view === "run" ? "active" : ""}`}
            onClick={() => setView("run")}
            disabled={!report}
          >
            Latest Run
          </button>
          <button
            className={`nav-item ${view === "reports" ? "active" : ""}`}
            onClick={() => {
              setView("reports");
              refreshReports();
            }}
          >
            Reports
          </button>
        </nav>
        <div style={{ marginTop: "auto", padding: "0 8px" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
            Make agent skills testable, reproducible and reusable.
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            {view === "skills" && "Skills"}
            {view === "skill-detail" && selected}
            {view === "run" && (report ? `Run · ${report.run_id}` : "Latest Run")}
            {view === "reports" && "Reports"}
          </div>
          <div className="topbar-meta">
            {hasCodex === null ? null : hasCodex ? (
              <span className="badge badge-ok">Codex connected</span>
            ) : (
              <span className="badge badge-warn">Mock executor</span>
            )}
          </div>
        </header>

        <div className="content">
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "var(--danger-soft)",
                color: "var(--danger)",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {view === "skills" && (
            <div className="stack">
              <div className="row-between">
                <div className="section-title" style={{ marginBottom: 0 }}>
                  Available Skills
                </div>
                <button className="btn btn-ghost btn-sm" onClick={refreshSkills}>
                  Refresh
                </button>
              </div>
              {skills.length === 0 ? (
                <div className="empty">No skills found under skills/</div>
              ) : (
                <div className="skill-grid">
                  {skills.map((s) => (
                    <button
                      key={s.name}
                      className={`skill-card ${selected === s.name ? "selected" : ""}`}
                      onClick={() => openSkill(s.name)}
                    >
                      <div className="skill-name">{s.name}</div>
                      <div className="skill-desc">{s.description || "No description"}</div>
                      <div className="skill-meta">
                        <span>{s.promptCount} prompts</span>
                        <span>·</span>
                        <span>{s.hasSkillMd ? "SKILL.md" : "missing"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "skill-detail" && selected && skillDetail && (
            <div className="stack">
              <div className="row-between">
                <div>
                  <div className="section-title" style={{ marginBottom: 4 }}>
                    Skill Detail
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{selected}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 13,
                    }}
                  >
                    <option value="">All tags</option>
                    <option value="explicit">explicit</option>
                    <option value="implicit">implicit</option>
                    <option value="contextual">contextual</option>
                    <option value="negative">negative</option>
                  </select>
                  <button className="btn btn-primary" onClick={handleRun} disabled={running}>
                    {running ? (
                      <span className="flex-center">
                        <span className="spinner" /> Running…
                      </span>
                    ) : (
                      "Run Evaluation"
                    )}
                  </button>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Prompts ({skillDetail.prompts.length})</div>
                  </div>
                  <div className="card-body">
                    <div className="prompt-list">
                      {skillDetail.prompts.map((p) => (
                        <div key={p.id} className="prompt-row">
                          <span className="prompt-id">{p.id}</span>
                          <span className={`tag ${p.should_trigger ? "tag-true" : "tag-false"}`}>
                            {p.should_trigger ? "trigger" : "no-trigger"}
                          </span>
                          <span className="prompt-text" title={p.prompt}>
                            {p.prompt}
                          </span>
                          <span className="tag">{p.tags || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">SKILL.md</div>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <pre className="pre-block" style={{ border: "none", borderRadius: 0 }}>
                      {skillDetail.content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "run" && (
            <div className="stack">
              {!report ? (
                <div className="empty">No run yet. Open a skill and click “Run Evaluation”.</div>
              ) : (
                <>
                  <div className="grid-3">
                    <div className="stat-card">
                      <div className="stat-label">Pass rate</div>
                      <div
                        className={`stat-value ${
                          report.summary.pass_rate === 1 ? "success" : "danger"
                        }`}
                      >
                        {(report.summary.pass_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Passed</div>
                      <div className="stat-value success">{report.summary.passed}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Failed</div>
                      <div className="stat-value danger">{report.summary.failed}</div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        Results · {report.skill} · {report.run_id}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {report.results.some((r) => r.artifacts.usedMock)
                          ? "Mock executor"
                          : "Real Codex"}
                      </div>
                    </div>
                    <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {report.results.map((r) => (
                        <div
                          key={r.prompt_id}
                          className={`result-row ${r.passed ? "pass" : "fail"}`}
                        >
                          <div className="result-head">
                            <span>{r.passed ? "✅" : "❌"}</span>
                            <span className="mono">{r.prompt_id}</span>
                          </div>
                          <div className="check-list">
                            {r.deterministic.map((c) => (
                              <div
                                key={c.id}
                                className={`check-item ${c.pass ? "pass" : "fail"}`}
                              >
                                <span className="mono">[{c.id}]</span>
                                <span>{c.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {view === "reports" && (
            <div className="stack">
              <div className="section-title">Past Runs</div>
              {reports.length === 0 ? (
                <div className="empty">No reports yet.</div>
              ) : (
                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                          <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 500 }}>Run ID</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 500 }}>Skill</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 500 }}>Pass rate</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 500 }}>Started</th>
                          <th style={{ padding: "12px 16px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr key={r.run_id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "12px 16px" }} className="mono">{r.run_id}</td>
                            <td style={{ padding: "12px 16px" }}>{r.skill}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  color: r.pass_rate === 1 ? "var(--success)" : "var(--danger)",
                                  fontWeight: 600,
                                }}
                              >
                                {(r.pass_rate * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                              {new Date(r.started_at).toLocaleString()}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openReport(r.run_id)}>
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
