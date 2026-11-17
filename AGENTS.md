# AGENTS.md — modern-web-guidance（本仓库的 Agent 工作约定）

本仓库是 Modern Web Guidance 的发布仓库：**209 篇现代 Web 最佳实践指南 + 22 篇 Chrome 扩展参考**。
任何涉及 HTML / CSS / 客户端 JS / 可访问性 / 性能 / 安全 / 表单 / 动画 / Web 组件的任务，**必须先检索指南，禁止凭记忆写现代 Web API**。

## 开始前（30 秒）

1. 读 [docs/PROJECT-OVERVIEW.md](docs/PROJECT-OVERVIEW.md) 了解项目结构与资产统计；
2. 读 [docs/KNOWLEDGE-MAP.md](docs/KNOWLEDGE-MAP.md) 查分类、检索配方与验收清单；
3. 需要逐条 id 时读 [.agents/skills/modern-web-guidance-router/references/intent-routes.md](.agents/skills/modern-web-guidance-router/references/intent-routes.md)（自动生成）。

## 强制工作流

```sh
# 1) 一次命中：检索并打印最佳指南全文（推荐；比 search+retrieve 少一次进程，快 ~2×）
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "<意图>"
#    需要对比多个候选时用 search（--json 供程序过滤）
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "<意图>"

# 2) 读全文：brief 已包含；单独读时用 retrieve（可一次多个 id）
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs retrieve "<id>[,<id>]"

# 3) 实现时遵守指南的 DO / DON'T 与强制 CSS/JS 片段；非 Baseline 特性必须按指南写 fallback
# 4) 验收：真实浏览器证据（截图/控制台/计算样式/性能），见 .agents/skills/frontend-verification/SKILL.md
# 5) 交付回复末尾写 "### Modern Web Guidance"：每条应用的指南一个 bullet（含原文短引语）；无应用则一句话说明查过什么
```

- 指南 id = 文件名去掉 `.md`；正文在 `skills/modern-web-guidance/guides/<category>/<id>.md`。
- 检索不到：换同义词再查一次（`drawer`↔`sidebar`、`toast`↔`notification`、`弹窗`↔`对话框`），再 `map`/`list` 浏览；确实无覆盖就说明并继续。
- **不覆盖**：后端、数据库、构建工具、CI/CD、Git、测试框架——不要编造 id。
- Chrome 扩展任务：先加载 `chrome-extensions` 技能，用 `mwg.mjs refs extensions|webstore` 选参考，再 `retrieve`。

## 验收（没有证据不算完成）

优先使用 `frontend-verification` skill（Playwright harness：多视口/明暗截图、console/pageerror、基础 a11y、LCP/CLS/long task、键盘焦点、断言 DSL、基线像素对比），产出 `report.json` + `report.md`。
迭代期用 `run --quick` 快速回归（约快 75%，但 quick PASS ≠ 完整验收）；**交付前必须跑一次完整 `run`**（默认并发 4，低核机器用 `--concurrency 2`）。
最低要求：每个改动的 UI 至少一张真实截图 + 控制台无 error + 与所检索指南的 DO/DON'T 逐条对照。

## 仓库约定

- 两个技能包：`skills/modern-web-guidance/`（主包）与 `skills/chrome-extensions/`（扩展包）；根清单 `plugin.json`、`.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/`、`.grok-plugin/`、`kimi.plugin.json`、`gemini-extension.json`、`.agents/plugins/marketplace.json` 面向不同宿主。
- **生成物不要手改**：`.agents/skills/modern-web-guidance-router/references/index.json`、`intent-routes.md`（由 `scripts/build-index.mjs` 生成）；README 的 `INJECT_*` 注入区由上游发布流程维护。
- 人工维护的是 `.agents/skills/modern-web-guidance-router/references/aliases.json`（按 id 的中英触发词）与 `zh-glossary.json`（中文→英文词表）；新增指南后重建索引：
  `node .agents/skills/modern-web-guidance-router/scripts/build-index.mjs`
- 本仓库只是发布目标；指南内容/缺陷请按 [CONTRIBUTING.md](CONTRIBUTING.md) 去 `GoogleChrome/modern-web-guidance-src` 提 PR。
- 许可：代码 Apache-2.0；`guides/` 内容 CC-BY 4.0。

## DSH 专属

- 技能目录：`.agents/skills/<name>/SKILL.md`（项目级，自动被发现）；本仓库现有 `modern-web-guidance-router`、`frontend-verification`。
- 专属 Agent preset：`agents/frontend-verify/`（「前端开发 · 测试验证」），已安装为 profile bundle `@local/dsh-frontend-verify-preset`；新建会话时在预设选择器中选择（安装/迁移见 `agents/frontend-verify/README.md` §3）。
- 技能中 `SKILL.md` 的 frontmatter 必须有 `name`（kebab-case）与 `description`；`references/`、`scripts/` 子目录不会被当成技能。
