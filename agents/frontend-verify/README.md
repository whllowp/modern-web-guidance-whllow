# 前端开发 · 测试验证（DSH Agent preset bundle）

一个给 **DeepSeek Harness (DSH)** 用的 Agent 预设 bundle。安装后，新建会话可以在预设列表里选择
「前端开发 · 测试验证」（preset id：`frontend-verify`），该会话就具备一条固定闭环：

```
检索 modern-web-guidance 指南  →  实现 / 改造前端代码  →  真实浏览器验收  →  中文汇报 + 证据
```

它不是安装动作，而是可安装的 **bundle 声明**：`package.json` 声明 bundle 与 patch 文件，
`cordis.patch.yml` 向 profile 的 Loader 树插入一条 `@deepseek-ai/dsh-agent-preset` 声明。
**本仓库交付时未执行安装**；安装由主 Agent 用 `plugin_manager` 的 `install_bundle` 完成。

---

## 1. 文件树与每个文件的作用

```
agents/frontend-verify/
├── package.json        # 合法的 npm 私有包 + dsh.bundle.patch 指向 patch 文件
├── cordis.patch.yml    # 预设声明：- insert: 一条 preset-frontend-verify 行（persona / 工具 / 分组）
└── README.md           # 本文档
```

| 文件 | 作用 |
| :--- | :--- |
| `package.json` | `name: @local/dsh-frontend-verify-preset`、`version: 0.1.0`、`private: true`、`type: module`；`dsh.bundle.patch: ./cordis.patch.yml` 是 DSH 识别 bundle 的唯一入口。无运行时依赖、无构建脚本。 |
| `cordis.patch.yml` | 顶层是 **YAML 数组**（loader patch 列表），只有一个 `- insert:`；插入一行 `id: preset-frontend-verify`、`name: @deepseek-ai/dsh-agent-preset` 的声明，`config` 里有 `id/name/description/order/plugins`。所有 `!!js` 表达式由宿主 Loader 在插件激活时求值，不能加引号变成字符串。 |
| `README.md` | 说明、插件清单、安装/选择预设、与两个技能的配合、自检方法、已知限制。 |

预设身份：`config.id: frontend-verify`、`config.name: 前端开发 · 测试验证`、`config.order: 20`。

---

## 2. 插件清单与每个插件的作用

组合原则：**只取「能做前端开发 + 能跑本地服务/构建 + 能技能检索 + 能浏览器验收」的最小充分集合**，
插件组合与参数照抄官方 `standard` 预设；刻意**不挂** office / goal / schedule / plugin-manager /
plugin-market 等与前端开发验证无关的插件。

### 2.1 顶层单行插件（14 行）

| 行 id | 插件包 | 作用 |
| :--- | :--- | :--- |
| `persona` | `@deepseek-ai/dsh-persona` | 中文前端专家 persona：世界级前端工程标准、强制工作流、硬性证据规则、汇报格式 |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 加载仓库 `AGENTS.md` / `CLAUDE.md` 等指令（`maxBytes: 65536`） |
| `time-context` | `@deepseek-ai/dsh-time-context` | 每步注入当前时间与耗时 |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | Windows 上执行 pwsh：装依赖、构建、起 dev server、跑验收脚本（非 Windows 禁用） |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | POSIX 上执行 bash，能力同上（Windows 禁用） |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 读 / 写 / 编辑文件；`applyPatch: false`（前端任务用 `edit` 足够） |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | `glob` / `grep` 检索；`sampleOverCapGlobResults: false` |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 后台任务（`job_output/list/kill`）：dev server 等长驻进程 |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 技能发现：项目 `.agents/skills` + 用户技能根 + `customSkillDirs`（内置 `dsh-doc`），并 watch 新技能 |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 模型侧 `skill` 工具：加载 `modern-web-guidance-router` / `frontend-verification` 技能正文 |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | `ask_user_question`：只在用户才能决定的选择/歧义上提问 |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | `todo_write` 进度跟踪；`allowParallelInProgress: true` |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | `web_search` / `web_fetch`（查浏览器支持基线、第三方文档；本仓库指南优先本地检索） |
| `present` | `@deepseek-ai/dsh-tool-present` | `present`：把截图、`report.md`、`report.json` 等交付物声明为文件卡片 |

### 2.2 分组插件（3 个 `cordis:group`，含 9 个子行）

| 分组 | 子行 | 作用 |
| :--- | :--- | :--- |
| `planning`<br>`isolate.planMode: true` | `plan-mode` | 计划模式：先探索、写决策完备的计划、`exit_plan_mode` 交用户批准后才动手（可选，见 §6 限制 9） |
| `compaction`<br>`isolate.compaction/toolResultPruner` | `compaction-basic`、`command-compact`、`tool-result-pruner` | 长会话自动压缩、`/compact` 手动压缩、工具结果 head/middle/tail 裁剪（8192/4096/1024 字符） |
| `delegation`<br>`isolate.workflowEngine: true` | `tool-subagent-control`、`tool-subagent`（spawn）、`tool-subagent-fork`（fork）、`workflow-ptc`、`tool-workflow` | 子代理派发与中断、`subagent` / `subagent_fork` 工具、workflow 编排（大批量多文件改造时用） |

所有插件名都已在 DSH 的 `packages.md`（`@deepseek-ai/dsh-agent-preset` 技能包内，
`skills/dsh-doc/references/packages.md`）中逐条核对，见 §5。

---

## 3. 安装

### 3.1 首选：`plugin_manager` 的 `install_bundle`（主 Agent 执行）

```jsonc
// plugin_manager({
//   action: "install_bundle",
//   target: "E:\\front-google\\modern-web-guidance-whllow\\agents\\frontend-verify"
// })
```

- `target` 必须是 **bundle 目录的绝对路径**（不是 `package.json`、不是仓库根）。
- 无依赖、无 `prepare`/构建脚本，不需要 `approvedBuilds`。
- `install_bundle` 会自己把本地目录以 `link:` 依赖装进 profile、把
  `@local/dsh-frontend-verify-preset` 追加到 profile `package.json` 的 `dsh.profile.bundles`
  （在 bundle 分层中最后应用本 patch），然后让 Loader 重新组合。
- 安装会在 Host 进程执行插件代码，需要 **Full access** 或显式审批；改动是 **profile 级**的，
  对所有后续会话生效并跨重启保留。

### 3.2 安装后核对（3 步）

1. `plugin_manager` `action: list_bundles` → 出现 `@local/dsh-frontend-verify-preset`；
2. `plugin_manager` `action: list_plugins` → 出现行 `preset-frontend-verify`
   （`name: @deepseek-ai/dsh-agent-preset`），`enabled` 为真、`fiberPhase` 为 active（不是 `false`/`failed`）；
3. **新建会话**选择该预设后，工具清单里应有 `skill`、`job_*`、`ask_user_question`、`todo_write`、
   `subagent`、`workflow`、`present`，且**没有** `office_*`、`/goal`、`/schedule` 等工具。

安装结果以 `plugin_manager` 返回的 `application` / `warnings` 为准；日志和页面 boot payload 不构成结论。
激活失败时该行会以带诊断信息的形式留在 roster 上：修正 patch（JSON 语法、插件名拼写、
`!!js` 被引号包裹等）后重新 `install_bundle`。

### 3.3 本机安装状态（2026-11-18，真实执行记录）

**已安装成功并生效**：`plugin_manager` `install_bundle`（target 见 3.1）返回
`application: applied`、`bundle: @local/dsh-frontend-verify-preset@0.1.0`、`warnings: []`；
`list_bundles` 中该条目 `enabled: true`、`installed: true`，行 `preset-frontend-verify`
（`@deepseek-ai/dsh-agent-preset`）已进入 profile。安装使用 pnpm v11.28.5（`Already up to date`），
未触发任何构建脚本。后按 §3.2 在新建会话验证：预设在「前端开发 · 测试验证」位置可选。

> 历史记录：2026-11-16 首次尝试曾失败于 `[ERR_PNPM_UNEXPECTED_STORE]` —— profile 的
> `node_modules` 由 pnpm store v10 链接、当前 pnpm 要 v11。该 profile 依赖后来已按 pnpm v11
> 重装，2026-11-18 重试即成功。若在其他机器复现同样报错：先重装 profile 依赖，再重跑
> `install_bundle`（涉及 profile 重装，先备份/提交 profile 配置），不要手写 profile 配置绕过安装器。

本仓库的 **两个技能无需安装**：项目级 `.agents/skills/` 已被 DSH 自动发现（`modern-web-guidance-router`
与 `frontend-verification`），在任意会话中均可直接加载。

### 3.4 等价方式（GUI / CLI 回退）

- **GUI**：Plugins 页 → 添加插件 → 选择本地目录 `…\agents\frontend-verify`。
- **CLI（高级，需先完全退出 DSH Desktop，避免 profile 锁）：**
  ```powershell
  # Desktop 自带 CLI（不要用旧版 npm 全局 dsh，它会拒绝 desktop profile）
  & 'D:\tool\dsh\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add `
    'link:E:\front-google\modern-web-guidance-whllow\agents\frontend-verify'
  ```
  然后把 `"@local/dsh-frontend-verify-preset"` 追加到
  `C:\Users\<你>\.dsh\profiles\desktop\package.json` 的 `dsh.profile.bundles` 数组末尾，再启动 DSH。
  （`plugin_manager` 会自动完成这两步，优先用它。）

### 3.5 卸载 / 回滚

```jsonc
// plugin_manager({ action: "remove_bundle", target: "@local/dsh-frontend-verify-preset" })
```

或临时停用：`set_bundle` / 在 Plugins 页关掉该 preset 行。卸载只删 bundle 声明与依赖，
已存在的会话不受影响（新建会话不再出现该预设）。

---

## 4. 安装后如何在新会话选择预设

1. 新建会话时，在会话的 **预设（Agent / preset）选择位**里选「**前端开发 · 测试验证**」；
   预设列表按 `order` 排序（standard=1、minimal=3、本预设=**20**）。
2. 也可以把它设为 **默认预设**：设置 → 通用（Agent preset 区）→ 默认预设选它；之后新建的会话
   直接使用它（只影响新建会话）。
3. 已存在/正在运行的会话**不会**切换预设：预设修订在会话创建时固定，必须新建会话验证。

---

## 5. 与两个技能的配合方式

### 5.1 技能如何被发现

`skill-filesystem` 按下面顺序扫描技能根（数字是 rank，同名单取靠前者）：

| rank | 来源 | 路径 |
| --- | --- | --- |
| 100 | project-dsh | `<项目根>/.dsh/skills` |
| 200 | project-agents | `<项目根>/.agents/skills` |
| 300 | custom（本预设） | `@deepseek-ai/dsh-agent-preset` 包内 `skills/`（含 `dsh-doc`） |
| 400 | user-dsh | `$DSH_HOME/skills` |
| 500 | user-agents | `~/.agents/skills` |
| 600 | bundled | 宿主内置技能根 |

`<项目根>` = 最近的含 `.git` 的祖先目录。**本仓库的两个技能就位于
`.agents/skills/modern-web-guidance-router/` 与 `.agents/skills/frontend-verification/`**，
所以在以本仓库为 workspace 的会话里会自动出现在技能目录中；本预设只额外保留官方同款的
`customSkillDirs` 表达式（内置 `dsh-doc`），两者不冲突。

> 跨项目使用时：把这两个技能目录一起复制或软链到目标项目的 `.agents/skills/`，
> 或者放到 `$DSH_HOME/skills/`（用户级、所有会话可见）。注意 `modern-web-guidance-router`
> 的脚本依赖本仓库内的 `skills/modern-web-guidance/guides/`，离开本仓库时请连同仓库一起携带。

### 5.2 `modern-web-guidance-router`（离线检索，零网络）

Agent 在**任何** HTML / CSS / 客户端 JS / 可访问性 / 性能 / 表单 / 动画 / Web 组件 / 安全任务
开始前先加载该技能，再按技能文档执行：

```sh
# 一次命中：路由并打印最佳指南全文（1 个进程，比 search+retrieve 快约 2×、路由开销少约 86%）
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "<2-5 词意图>"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "暗色模式 滚动条" --two
# 需要比较多个候选或机器可读输出时
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "<2-5 词意图>"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs retrieve "<id>[,<id>]"
```

其他命令：`map` / `list` / `cats` / `stats` / `check` / `features` / `glossary` / `routes` / `refs`。
它替代原版需要联网的 `npx modern-web-guidance search/retrieve`，索引是本地生成物
（`references/index.json`、`intent-routes.md`，由 `scripts/build-index.mjs` 生成，不要手改）。

### 5.3 `frontend-verification`（真实浏览器验收）

实现完成后 Agent 加载该技能，用它的 Playwright harness 产出可核对证据：

```sh
# 迭代期快速回归：单视口 1 张截图 + console/a11y/overflow/checks（比 full 快约 75%，只用于 PR 前冒烟）
node .agents/skills/frontend-verification/scripts/verify.mjs run --url "http://127.0.0.1:5173/" --checks checks.json --quick
# 交付前全量验收（多视口 × 明暗截图 + console/pageerror + a11y + 横向溢出 + 性能 + 键盘焦点 + 断言 + 基线）
node .agents/skills/frontend-verification/scripts/verify.mjs run `
  --url "http://127.0.0.1:5173/" --checks checks.json --out .\verify-out --concurrency 4
# 只截一张图 / 只查 a11y / 只看性能 / 比较两张基线图
node .agents/skills/frontend-verification/scripts/verify.mjs shot --url "http://127.0.0.1:5173/" --out dark.png --theme dark
node .agents/skills/frontend-verification/scripts/verify.mjs a11y --url "http://127.0.0.1:5173/"
node .agents/skills/frontend-verification/scripts/verify.mjs perf --url "http://127.0.0.1:5173/"
node .agents/skills/frontend-verification/scripts/verify.mjs compare --a before.png --b after.png --out diff.png
```

`--quick` 的 `report.mode='quick'`、`quick-mode` 警告与 `skipped` 列表会标明覆盖边界：**quick PASS 不等于完整验收**，交付前必须再跑一次 full。`--concurrency` 默认 `min(4, 采集数)`，低核机器用 2，依赖跨页共享状态时用 1。
harness 本身零 npm 依赖，但**需要本机已装 Playwright 及其浏览器**；`--help` 有完整参数表，`scripts/bench-verify.mjs` 可做同机 A/B 基准。

### 5.4 Agent 内部闭环（persona 强制）

1. 加载 `modern-web-guidance-router` → `brief`（必要时 `search`/`retrieve`）→ 按指南 DO/DON'T 与 fallback 实现；
2. shell 起构建 / dev server（长驻进程放后台，`job_*` 跟踪）；
3. 加载 `frontend-verification` → 迭代期跑 `run --quick`，交付前跑 full `run` 并留 `report.json`/`report.md` 与截图；
4. 中文汇报：结论 + 改动清单 → 证据（截图/日志/指标）→ 末尾 `### Modern Web Guidance`
   披露小节（每条实际应用的指南一个 bullet + 原文短引语；无应用则一句话说明查过什么）。
   没有证据就写「未验证」并给出原因，**禁止**自述「已完成」。

---

## 6. 自检方法（交付时已执行）

1. **JSON**：`node -e "JSON.parse(require('fs').readFileSync('agents/frontend-verify/package.json','utf8'))"` 通过。
2. **YAML 结构**：用 DSH 安装内自带的 `js-yaml@4.3.2` + DSH include 同款 `!!js`
   自定义 tag（`tag:yaml.org,2002:js`）解析 `cordis.patch.yml`，然后断言：
   顶层数组长度 1、含 `- insert:`、`insert` 长度 1、row `id/name/config` 齐全、
   `config.id/name/description/order` 正确、`plugins` 嵌套行都含 `id`+`name`、id 无重复、
   3 个 `cordis:group` 的 `group: true` 且 `config` 是数组、`isolate` 与官方 standard 一致、
   无 tab / 无行尾空白、3 处 `!!js` 均可被 `new Function` 编译。
3. **平台开关**：`tool-bash` 的 `disabled: !!js process.platform === 'win32'`，
   `tool-pwsh` 的 `disabled: !!js process.platform !== 'win32'`（与 standard 逐字一致）。
4. **内置技能路径**：`customSkillDirs` 的 `!!js` 表达式与官方 `standard.patch.yml` **逐字一致**
   （通过 `createRequire(baseUrl)` 解析 `@deepseek-ai/dsh-agent-preset` 再拼 `skills`）。
5. **插件名对照**：23 个插件行去重后逐个匹配 `skills/dsh-doc/references/packages.md` 的
   `| \`包名\` | Config |` 表行，全部命中；并确认 office/goal/schedule/plugin-manager/plugin-market
   均未出现。
6. **参数照抄**：`agent-instructions.maxBytes`、`tool-fs.applyPatch`、`tool-fs-search.*`、
   `tool-todo.*`、`tool-web.*`、`tool-subagent-control.*`、两个 `tool-subagent` 的
   provider/toolName、`workflow-ptc.provider`、`tool-result-pruner.*` 全部与 standard 一致。

结果：**193 项断言全部通过（0 失败）**。本交付目录只有 3 个文件，未改动仓库其它文件，
未调用 `plugin_manager` 安装。

浏览器侧冒烟（安装后由主 Agent/用户执行，本 bundle 交付时未安装）：

```sh
node .agents/skills/frontend-verification/scripts/verify.mjs --help   # 0.2 秒级工具自检
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs stats  # 索引/技能版本自检
```

---

## 7. 已知限制与风险

1. **尚未真机安装**：本 bundle 只做静态自检；实际激活状态以安装后 `plugin_manager`
   `list_plugins` 的 `enabled`/`fiberPhase` 为准。安装/激活由主 Agent 完成。
2. **只影响新会话**：预设修订在会话创建时固定，已存在会话保持原插件修订；必须新建会话验证。
3. **技能可发现性依赖 workspace**：两个技能在 `<项目根>/.agents/skills/`，只有项目根（最近
   `.git` 祖先）是本仓库的会话才直接可见；跨项目使用要复制/软链到目标项目，或安装到
   `$DSH_HOME/skills/`（本项目已同时被 `~/.dsh/skills`、`~/.agents/skills` 等用户根扫描机制支持）。
4. **浏览器验收的外部依赖**：`frontend-verification` harness 需要本机已有 Playwright 及其浏览器；
   没有浏览器 / 没有网络 / 端口被占用时 Agent **必须**报告「未验证」与原因，不能伪造截图。
5. **router 依赖本仓库语料**：`mwg.mjs` 读取仓库内 `skills/modern-web-guidance/guides/`；
   仓库不在一起时只能退回联网 `npx modern-web-guidance@latest`（与原版技能一致）。
6. **刻意精简**：不包含 office / goal / schedule / plugin-manager / plugin-market / 持久终端 /
   浏览器 MCP（playwright-mcp 等）插件。需要这些能力时用 standard 预设，或另行安装对应 bundle。
7. **`!!js` 表达式与 DSH 版本绑定**：平台判断与 `customSkillDirs` 依赖宿主 Loader 的求值语义
   （`baseUrl`、`process.platform`）。升级 DSH 大版本后若预设激活失败或内置技能消失，
   对照新版 `presets/standard.patch.yml` 更新这几行并重装。
8. **profile 级全局性**：安装后预设对 profile 内所有新会话可见；只有选中它的会话才获得这些工具。
   安装会在 Host 进程执行 bundle 代码，需要 Full access/审批，卸载用 `remove_bundle`。
9. **plan-mode 默认挂载**：`planning` 分组随预设挂载（会话仍以普通模式启动，需 `/plan` 或
   `exit_plan_mode` 流程进入）。如不需要，删除 `cordis.patch.yml` 里 `id: planning` 整组后重装即可
   ——这是本预设唯一可选的组件。
10. **persona 占用固定 token**：每次请求都带约 1.6k 字符中文 persona；这是刻意的行为约束成本。
11. **`order: 20` 只影响预设列表排序**，与能力无关；不改动任何内置 preset 行（只 `insert` 新行）。
