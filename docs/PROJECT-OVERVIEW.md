# Modern Web Guidance — 项目总结（Agent 视角）

> 目标读者：在本仓库或本机工作的编码 Agent / 维护者。读完后应当知道「这个仓库是什么、知识放在哪、如何用最少的 token 精准找到对应指南、如何验收」。
> 配套文档：[Knowledge Map（知识地图与检索配方）](KNOWLEDGE-MAP.md) · [仓库根 AGENTS.md](../AGENTS.md) · [路由 SKILL](../.agents/skills/modern-web-guidance-router/SKILL.md)

---

## 1. 一句话定位

**Modern Web Guidance 是一套「把现代 Web 平台最佳实践注入编码 Agent 上下文」的技能包**：用 209 篇高密度 Markdown 指南（约 2.0 MB）+ 22 篇 Chrome 扩展参考，替代模型的过时训练权重，让 Agent 用原生平台能力（`<dialog>`、Popover、View Transitions、容器查询、`:has()`、`fetchpriority`、Sanitizers、Passkeys 等）而不是旧的 JS 拼装方案。

- 上游：`GoogleChrome/modern-web-guidance`（由 Chrome、Edge、Firefox、MDN 团队共同维护）
- 源仓库（接受 PR）：`GoogleChrome/modern-web-guidance-src`
- 本仓库：`whllowp/modern-web-guidance-whllow`，是**发布目标仓库**的 fork，当前 `main` 干净，版本 `1.0.0`（[package.json](../package.json)）。
- 许可：代码 Apache-2.0；`guides/` 内容 CC-BY 4.0（见 [README](../README.md) 末尾）。

## 2. 仓库地图

| 路径 | 内容 | Agent 用法 |
| :--- | :--- | :--- |
| [skills/modern-web-guidance/](../skills/modern-web-guidance/) | 主技能包：`SKILL.md` + 209 篇指南 | 检索入口；`SKILL.md` 是给 Agent 的强制工作流 |
| [skills/modern-web-guidance/guides/](../skills/modern-web-guidance/guides/) | 17 个分类目录，`<category>/<id>.md` | 指南正文；**id = 文件名去掉 `.md`** |
| [skills/chrome-extensions/](../skills/chrome-extensions/) | 独立技能包：`SKILL.md`（530 行 Mandatory Rules）+ `references/` 22 篇 | 扩展开发/上架；`references/extensions/` 19 篇、`references/webstore/` 4 篇 |
| [README.md](../README.md) | 108 KB；含**203 条用例描述**与**250 项特性目录**（注入区） | 机器可读索引的数据源；人读总览 |
| [package.json](../package.json) | `contributes.chatSkills` 指向主 `SKILL.md`；`bin` 指向 `modern-web.mjs` | VS Code 技能注册与 CLI 入口 |
| [plugin.json](../plugin.json) 等 | 面向 agent-plugins 规范的包元数据 | 插件市场 |
| [.claude-plugin/](../.claude-plugin/) [.codex-plugin/](../.codex-plugin/) [.cursor-plugin/](../.cursor-plugin/) [.grok-plugin/](../.grok-plugin/) [kimi.plugin.json](../kimi.plugin.json) [gemini-extension.json](../gemini-extension.json) [.agents/plugins/marketplace.json](../.agents/plugins/marketplace.json) | 各宿主 Agent 的插件清单/市场清单 | 按宿主安装 |
| [policies/modern-web-guidance.toml](../policies/modern-web-guidance.toml) | Gemini CLI 策略：plan 模式下 `modern-web` 命令需询问 | 权限配置参考 |
| [assets/logo.png](../assets/logo.png) [.github/img/](../.github/img/) | 品牌图 | 图标/README 插图 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 声明本仓库只是发布目标，PR 请去 src 仓库 | 贡献边界 |
| `.agents/skills/modern-web-guidance-router/` | **本项目新增**：离线知识路由器（SKILL + 检索 CLI + 索引 + 中英路由词表） | 零网络精准检索，见 [KNOWLEDGE-MAP](KNOWLEDGE-MAP.md) |
| `.agents/skills/frontend-verification/` | **本项目新增**：真实浏览器验收 skill（Playwright harness） | 交付前验收 |
| `agents/frontend-verify/` | **本项目新增**：DSH Agent preset bundle「前端开发 · 测试验证」 | 在 DSH 会话中选择该 Agent |

## 3. 知识资产（已核实数字）

| 资产 | 数量 | 说明 |
| :--- | :--- | :--- |
| 用例指南 | 209 篇 `.md` | 17 个分类；其中 203 篇在 README 有策划好的描述，其余 6 篇描述由正文首段派生 |
| 分类 | 17 | accessibility(4) built-in-ai(5) css(18) forms(19) html(8) js(5) performance(26) privacy(1) pwa(2) security(17) ui-atoms(13) ui-behaviors(40) ui-components(22) user-experience(3) visual-design(22) wasm(1) webmcp(3) |
| 纪律型（跨领域）指南 | 12 | `accessibility` `css` `forms` `html` `performance` `privacy` `security` `motion` `color` `typography` `visual-effects` `webmcp` — 这些是「架构/原则」层，命中主题时与用例指南一起读 |
| Chrome 扩展参考 | 22 篇 | 19 篇扩展 API/上下文 + 4 篇 Web Store（模板、隐私政策、审核清单、商店文案） |
| 特性目录 | 250 项 | README 中按 CSS & Layout(140) / HTML & DOM(36) / JavaScript & APIs(74) 分组，附 web-features-explorer 链接 |
| 指南正文体量 | ≈2.0 MB / 209 篇 | 平均 ~9.6 KB；密度高、按 eval 裁剪过 |
| 上游技能版本 | `2026_11_09-5bcc021b` | 从 `skills/modern-web-guidance/SKILL.md` 的 `--skill-version` 读取；离线检索时用于对齐 CLI |

**数据来源链路**：`guides/*.md`（正文与标题、`##`/`###` 小标题、交叉引用 `retrieve "id"`）+ README 注入区（用例描述、特性目录）+ `references/aliases.json` 与 `zh-glossary.json`（本项目人工中英触发词）→ `build-index.mjs` → `references/index.json`（Agent 检索用）。

## 4. 两个技能包的职责边界

### 4.1 `modern-web-guidance`（主包）

- **强制触发**：所有 HTML/CSS/客户端 JS 任务的开头（弹层、表格、暗色模式、锚点定位、容器查询、视图过渡、滚动动画、视差、表单/校验/自动填充、可访问性、自定义选择器、滚动条、CWV、内容可见性、图片优先级、安全、Passkeys、HTML 净化、Web 组件、日期时区、内置 AI、WASM、框架内使用标准 Web API……）。
- **明确不触发**：后端（SQL/ORM/API routes）、基础设施（CI/CD、Docker、Actions、Python/Go、Git）、工具/琐事（Vite、tsconfig、ESLint、测试、复制改名、第三方文档）。
- **工作流**：`search` 用例 → `retrieve` 全文 → 实现 → 按指南逐条核对 → 在交付回复里写 `### Modern Web Guidance` 披露小节（每条应用的指南一个 bullet + 原文引语）。

### 4.2 `chrome-extensions`（独立包）

- Manifest V3 构建规则（图标必须真实存在、side panel 必须可打开、CSP 下只能用 sandbox iframe、`onClicked` 与 popup 互斥、`setPanelBehavior` 属性名等）+ 22 篇按需参考 + Web Store 上架/审核/隐私政策流程。
- 与主包的分工：扩展页面内的通用 Web 能力仍走主包；扩展专属（`chrome.*`、service worker 生命周期、权限、消息、CSP、商店）走本包。

## 5. 检索链路与「安全采纳」策略

### 5.1 官方 CLI（需要网络；官方推荐）

```sh
npx -y modern-web-guidance@latest search "<2-5 词意图>"          # 本地离线嵌入 + BM25，返回 [{id, description}]
npx -y modern-web-guidance@latest retrieve "<id>"               # 返回完整指南
npx -y modern-web-guidance@latest legacy-scan <path> --json     # 仅适用于"广泛的存量现代化"
```

- `search` 是**离线、零依赖、无 API key** 的语义+关键词混合检索；`retrieve` 大输出会落临时文件，需用文件读取工具读全。
- **门控**：实验性 Origin Trial / 易变特性（单引擎、3 个月内）在 `search` 可见，但 `retrieve` 需要 `.mwgrc` 显式开启：
  - `set-allow-origin-trials` → `"allowOriginTrials": true`
  - `set-allow-volatile-features` → `"allowVolatileFeatures": true`
  - 文件位置：项目根 `.mwgrc`，或用户级 `~/.mwgrc`。
- **遥测**：收集安装数、调用 Agent 名、retrieve 的指南 id、search 查询词；不含原始用户 prompt。`DISABLE_TELEMETRY=1` 关闭。
- **本仓库离线替代**：`.agents/skills/modern-web-guidance-router/scripts/mwg.mjs`（见 [KNOWLEDGE-MAP](KNOWLEDGE-MAP.md)），零网络、支持中文查询，索引由本地 209 篇指南生成。

### 5.2 采纳策略（写代码时）

| 原则 | 做法 |
| :--- | :--- |
| Baseline 默认 | *Baseline widely available* 的特性可直接用、不需要 fallback |
| 非 Baseline | **必须**按指南给出的 fallback 建议实现，除非用户定义了浏览器支持策略 |
| 轻量优先 | 优先 <50 行、案例化的小 fallback；拒绝重型 polyfill/旧库 |
| 区分增强与关键 | 纯增强（如 speculation rules）可让旧浏览器静默忽略；关键行为（弹层控制、网络信标）要写低开销 fallback |
| 已知坑 | 指南会写明平台怪癖（如 `fetchLater()` 64KB 配额、macOS 滚动条行为） |
| 框架内适配 | 用 spread/cast 保留新 HTML 属性；SSR 中 guard `window`；`showModal()`/`moveBefore()` 通过 ref 调用；`useId()` 生成实例级 id/`anchor-name`；`:root` 与 `@starting-style` 保持顶层不 scoped |

## 6. 评估体系（为什么值得信任）

README 记录的闭环：专家指南 + 真实 base app（`daily-grind`、`devtools-times`）+ 模拟开发者任务（不点名 API，考察 Agent 是否能自己发现指南）+ Playwright grader（源码模式、计算样式、运行时 DOM、可访问性状态）+ golden solution 100% 通过 / 未修改基线 0% 通过的校准 + 有/无技能对比（机会 = 100% - 无引导通过率；提升 = 有引导 - 无引导）。

最近一次快照（README 注入区，2026-11-08）：

| Agent + 模型 | 任务/断言 | 无引导 → 有引导（提升） |
| :--- | :---: | :---: |
| antigravity_cli (gemini-4-argon) | 214 / 1673 | 58% → 94% (+36pp) |
| codex_cli (gpt-6.1-sol) | 215 / 1795 | 54% → 82% (+28pp) |
| claude_code (opus-5-5) | 215 / 1801 | 57% → 88% (+31pp) |

## 7. 安装 / 更新矩阵

| 宿主 | 方式 |
| :--- | :--- |
| 通用向导 | `npx modern-web-guidance@latest install`（可 `--choose` 选择 `modern-web-guidance` / `chrome-extensions` 技能包） |
| Vercel Skills CLI | `npx skills add GoogleChrome/modern-web-guidance` |
| GitHub CLI | `gh skill install GoogleChrome/modern-web-guidance` |
| Google Antigravity | `agy plugin install https://github.com/GoogleChrome/modern-web-guidance` |
| GitHub Copilot CLI | `/plugin marketplace add …` → `/plugin install modern-web-guidance@googlechrome` |
| Claude Code | 同上，并开启 AutoUpdate；`/reload-plugins` |
| Grok Build CLI | `grok plugin install https://github.com/GoogleChrome/modern-web-guidance --trust` |
| Kimi Code | `/plugins install https://github.com/GoogleChrome/modern-web-guidance` |
| OpenAI Codex | `codex plugin marketplace add …` → `codex plugin add modern-web-guidance@googlechrome` |
| 更新 | `npx modern-web-guidance@latest update`，或宿主自身的插件更新机制 |

对应本仓库的清单文件见第 2 节表格。

## 8. 本仓库新增的「Agent 导航 + 验收」层

为了让 Agent **快速、精准、离线**命中上述知识，本仓库新增：

1. **[Knowledge Map](KNOWLEDGE-MAP.md)** — 分层知识地图：分类索引、纪律指南、常见任务→检索配方、弱结果处理、验收清单。
2. **[modern-web-guidance-router skill](../.agents/skills/modern-web-guidance-router/SKILL.md)** — 强制工作流 + 零网络检索 CLI（`scripts/mwg.mjs`）+ 自动生成索引（`references/index.json`，209 指南 + 24 扩展资产 + 250 特性）+ 中英路由词表（`references/intent-routes.md`、`aliases.json`、`zh-glossary.json`）。
3. **[frontend-verification skill](../.agents/skills/frontend-verification/SKILL.md)** — Playwright 真机验收：多视口/明暗主题截图、控制台/网络错误、基础 a11y、性能指标、键盘焦点、像素对比、断言 DSL，输出 `report.json` + `report.md` 证据。
4. **`agents/frontend-verify/` bundle** — DSH Agent preset「前端开发 · 测试验证」：强制「先检索指南 → 实现 → 真实浏览器验收 → 证据化汇报」的 persona 与工具组合。已通过 `plugin_manager` `install_bundle` 安装到本机 `desktop` profile（`@local/dsh-frontend-verify-preset`，新建会话可选）。
5. **[EFFICIENCY-REPORT.md](EFFICIENCY-REPORT.md)** — 10 轮效率迭代的实测报告：主任务流 −52.0%、完整验收 −52.2%、`--quick` 内循环 −65%…−80%、路由开销 −85.9%，含每轮改动、复现命令与诚实边界（索引瘦身到正文 1200 字符、quick 覆盖范围、机器波动）。

## 9. 关键事实速查

```text
仓库根            = 含 skills/modern-web-guidance/guides 的目录（本项目即仓库根）
指南 id           = 文件名去掉 .md（如 guides/ui-components/dialog.md → dialog）
完整检索         = node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "<意图>"
读全文           = node …/mwg.mjs retrieve "dialog,light-dismiss-a-dialog"
重建索引         = node .agents/skills/modern-web-guidance-router/scripts/build-index.mjs
一致性自检       = node …/mwg.mjs check
上游版本         = skills/modern-web-guidance/SKILL.md 内 --skill-version
正式 CLI         = npx -y modern-web-guidance@latest {search|retrieve|legacy-scan}
```

## 10. 维护与更新

1. **同步上游**：`git fetch origin` 后快进 `main`（本仓库是发布目标，内容由上游 release 生成）。
2. **重建本地索引**：拉取后运行 `build-index.mjs`；`mwg.mjs stats` 会提示 STALE，`mwg.mjs check` 会校验文件/计数一致性。
3. **不要手改生成物**：`references/index.json` 与 `references/intent-routes.md` 由脚本生成；人工维护的是 `references/aliases.json`、`references/zh-glossary.json`。
4. **不要手改 README 注入区**：`INJECT_SKILL_COVERAGE_*` / `INJECT_EVAL_RESULTS_*` 由上游发布流程注入。
5. **贡献指南内容**：按 [CONTRIBUTING.md](../CONTRIBUTING.md) 去 `GoogleChrome/modern-web-guidance-src` 提 PR。
6. **许可**：代码 Apache-2.0；`guides/` 文档 CC-BY 4.0（引用指南原文时保留出处）。

## 11. 常见误区

- ❌ 把 `npx` CLI 当成唯一检索方式 → 离线环境/沙箱里会挂；优先本地 `mwg.mjs`。
- ❌ 用 `legacy-scan` 去做「新增一个功能」→ 它只针对**广泛的存量现代化**，且只覆盖约 20% 有确定性规则的指南。
- ❌ 复合查询（`"responsive table dark mode animation"`）→ 拆成多次 `search`。
- ❌ 查询里带框架/页面/组件名（`React settings modal`）→ 用平台能力词（`modal dialog`）。
- ❌ 检索到指南后不读就写 → 指南的 DO/DON'T 与强制 CSS/JS 片段正是价值所在。
- ❌ 声称「已完成」却无证据 → 用 `frontend-verification` 出截图/控制台/计算样式。
- ❌ 忽略 Baseline 与 fallback 指令 → 把非 Baseline 特性无 fallback 地发给受限浏览器。
