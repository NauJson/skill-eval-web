export interface SkillInfo {
  name: string;
  promptCount: number;
  hasSkillMd: boolean;
  description?: string;
}

export interface PromptRow {
  id: string;
  should_trigger: boolean;
  prompt: string;
  tags?: string;
}

export interface CheckResult {
  id: string;
  pass: boolean;
  message?: string;
  evidence?: unknown;
}

export interface PromptResult {
  prompt_id: string;
  passed: boolean;
  deterministic: CheckResult[];
  artifacts: { jsonl: string; usedMock: boolean };
  error?: string;
}

export interface RunReport {
  run_id: string;
  skill: string;
  started_at: string;
  finished_at: string;
  results: PromptResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
  };
}

export interface ReportSummary {
  run_id: string;
  skill: string;
  pass_rate: number;
  started_at: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => request<{ ok: boolean; hasCodex: boolean }>("/api/health"),
  listSkills: () => request<SkillInfo[]>("/api/skills"),
  getSkill: (name: string) =>
    request<{ name: string; content: string; prompts: PromptRow[] }>(`/api/skills/${name}`),
  runSkill: (name: string, body?: { only?: string[]; tag?: string }) =>
    request<RunReport>(`/api/skills/${name}/run`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),
  listReports: () => request<ReportSummary[]>("/api/reports"),
  getReport: (runId: string) => request<RunReport>(`/api/reports/${runId}`),
};
