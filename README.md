# Skill Eval Harness (TypeScript + Web UI)

把 Agent Skill 的评估从「黑盒感觉」变成**可管理、可执行、可复现、可复用**的工程实践。

- **后端**：TypeScript + Express，负责加载 skill / prompts、执行评估、生成报告
- **前端**：React + Vite，现代化深色界面，支持浏览 skill、跑评估、查看历史报告
- **执行器**：优先使用真实 `codex` CLI；不存在时自动降级为确定性 Mock，保证链路可跑通

---

## 快速开始

```bash
cd skill-eval-web
npm install
npm run dev
```

然后打开：

- Web UI: http://localhost:5180
- API:    http://localhost:3001

---

## 功能一览

| 功能 | 说明 |
|------|------|
| Skills 列表 | 自动扫描 `skills/` 目录 |
| Skill 详情 | 查看 SKILL.md + 测试用例 prompts |
| 一键评估 | 按 tag 过滤后运行，实时看到 PASS/FAIL |
| 确定性检查 | skill 是否触发、是否执行 npm install、是否生成 package.json 等 |
| 历史报告 | 每次运行落盘，可回看 |
| Mock 执行器 | 无 codex 时也能完整演示与复现 |

---

## 项目结构

```text
skill-eval-web/
├── skills/                     # 被测 skill
│   └── setup-demo-app/SKILL.md
├── evals/
│   ├── prompts/*.csv           # 测试用例
│   ├── artifacts/              # 运行轨迹（自动生成）
│   └── reports/                # 报告（自动生成）
├── server/src/                 # TypeScript 后端
│   ├── index.ts                # API 入口
│   ├── runner.ts / executor.ts / checks.ts / loader.ts
│   └── cli.ts                  # 命令行入口
└── client/                     # React 前端
    └── src/App.tsx
```

---

## CLI 用法（可选）

```bash
npx tsx server/src/cli.ts list
npx tsx server/src/cli.ts run setup-demo-app
npx tsx server/src/cli.ts run setup-demo-app --tag explicit
```

---

## 设计理念

1. **失败可解释** — 每条检查都有明确原因 + JSONL 轨迹
2. **确定性优先** — 先硬规则，再考虑模型打分
3. **真实失败驱动** — 测试用例跟着实际踩坑持续增长
4. **可复现** — 即使没有真实 Codex，Mock 也能跑通整条链路
5. **对用户友好** — Web 界面降低使用门槛，告别纯命令行黑盒

---

## 下一步可扩展

- Rubric + `--output-schema` 风格评分
- 报告趋势图 / 版本对比
- GitHub Action CI
- 在线编辑 prompts / SKILL.md
