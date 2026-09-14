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
  artifacts: {
    jsonl: string;
    usedMock: boolean;
  };
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

export interface SkillInfo {
  name: string;
  promptCount: number;
  hasSkillMd: boolean;
  description?: string;
}
