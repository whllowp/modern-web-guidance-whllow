---
name: frontend-verification
description: |
  Evidence-based acceptance of frontend changes in a real browser: screenshots, console/page errors, accessibility, responsive overflow, performance (nav timing / LCP / CLS / long tasks), keyboard focus walkthrough, checks DSL assertions and baseline pixel diffs, producing report.json + report.md.
  Use whenever frontend work claims to be done and needs real-browser evidence: 前端页面/组件完成后验收、截图对比与视觉回归、可访问性（a11y）检查、响应式/移动端验收、控制台报错排查、性能/LCP/CLS/long task 检查、发布前验真、Chrome 扩展页面（popup/options/side panel）验证。任何声称已完成的前端改动在交付前都应跑一次真实浏览器验证，禁止只靠读代码或模型自述判定“完成”。
  Trigger even if the user only says “改好了/做完了/验收一下/看看效果/有没有问题”; if a page, component, CSS, dialog, form or extension UI was produced, verify it. Not for backend, infra, CI or non-visual refactors with no page output.
---

# Frontend Verification（真实浏览器验收）

**改完不算完成，看到证据才算完成。** 本技能把「页面/组件是否真的可用」变成可复现的命令 + 机器可读报告 + 截图证据，而不是模型自述。

## 核心原则

1. **真实页面 + 真实浏览器**：`file://` 页面、`http://localhost` dev server、远程 URL 都可以；禁止用 mock 页面/占位 HTML 冒充被验证页面。
2. **证据优先**：截图、`console` 原文、计算样式实际值、性能条目、退出码才算证据。报告里没有证据的结论视为无效。
3. **可复现**：交付时必须能贴出验证命令、`report.json` / `report.md` 路径与退出码。
4. **诚实降级**：跑不了浏览器就说清楚限制与未覆盖项，不允许「假装跑通」。

## 能力阶梯（先判断自己在哪一级，再降级并如实报告）

| 级别 | 具备条件 | 能做的验证 | 报告口径 |
| --- | --- | --- | --- |
| L0 完整 | 本机 Playwright + Chromium/Chrome（当前机器满足） | 全部：多视口/明暗截图、console、a11y、溢出、性能、焦点、checks、baseline | 直接给 `PASS/FAIL` + `report.json` |
| L1 部分 | 只有 Playwright 模块、无缓存浏览器，但有 Chrome/Edge | 同上，`--browser chrome` / `--browser "<chrome.exe 路径>"` | 同上 |
| L2 受限 | 只能启动某一固定视口/主题，或页面需要登录态 | 用 `shot` / `a11y` / `perf` 单点验证，明确写出未覆盖的视口、主题、页面态 | `部分验证`，禁止写 `PASS` |
| L3 静态 | 无浏览器可用（CI 沙箱等） | 只能做静态检查：`rg` 检查 alt/label/aria、读 CSS 检查断点、检查构建产物 | 必须声明「未做真实浏览器验证」，结论只能是 `静态检查通过/发现 N 处可疑`，不能写 `PASS` |

降级报告模板：

```
验证级别: L3（本机无法启动浏览器，错误: <原文>）
已验证: 静态检查 alt/aria/CSS 断点，共 N 项
未验证: 运行态 console、真实渲染、a11y 树、性能、响应式溢出
结论: 不构成验收通过，需要在有浏览器的环境补跑 scripts/verify.mjs run
```

## 标准流程（改完一轮 UI 后照做）

0. **落 URL**：确认要验的是哪个页面/组件入口。本地文件用 `file:///C:/...`（Windows 路径必须是斜杠形式，可用
   `([System.Uri]("$path")).AbsoluteUri` 生成）；dev server 用 `http://localhost:<port>/`。
1. **起跑**：`run` 一次跑完 6 个「视口 × 主题」采集 + 自动检查；有断言需求就带 `--checks`。
2. **读报告**：先看 stdout 摘要里的 `结论` 和 `阻断项`，再打开 `report.md` 看证据；机器消费读 `report.json`。
3. **修**：每条阻断项都带 selector / 期望 / 实际 / 证据截图，按证据修，不要猜。
4. **复跑**：同一命令复跑到 `PASS`；修复前后差异用 `compare` 或 `--baseline` 留档。
5. **交付**：贴出命令、退出码、`report.md` 路径和关键截图。

## 证据规则（什么算证据 / 什么不算）

算证据：

- `report.json` 里 `verdict`、`failures[]`、`summary` 与进程退出码；
- `report.artifacts.screenshots[]` 的绝对路径截图（多视口 × 明暗主题）；
- `evidence.consoleErrors[].raw` 的 console 原文与 `location`；
- `evidence.computedStyles[]` 的 `expected` vs `actual`（真实计算样式）；
- `a11y.uniqueViolations[]` 的 selector + HTML 片段；
- `baseline.comparisons[].diffPercent` 与 `diffPath` 差异图；
- `perf` 的 TTFB/FCP/LCP/CLS/longTasks 数值；
- `focus.tabStops[]` 的 Tab 序列、可访问名称与焦点环状态。

不算证据：模型说“已修复/应该没问题”、只读代码推断、用 `curl` 看 HTML、自己写的假报告、把 `--no-fail` 的退出码 0 当作通过（`--no-fail` 只改退出码，报告仍是 `FAIL`）。

## 本机路径事实（Windows 11 + PowerShell 7，已核实）

| 事实 | 值 |
| --- | --- |
| Node / npm | `v22.22.1` / `10.9.4` |
| 全局 Playwright | `%APPDATA%\npm\node_modules\playwright`（1.63.0，入口 `index.mjs`） |
| 浏览器缓存 | `%LOCALAPPDATA%\ms-playwright`（chromium-1223/1228/1243、headless_shell 等） |
| 本机 Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| 无 dev server | `file://` 页面可直接验证（本技能的夹具即 file:// 实测通过） |
| 默认启动 | Playwright 自带 `chromium-1243`（`playwright-bundled-chromium`），无需 channel |
| 备用启动 | `--browser chrome`（channel:chrome，实测 Chrome 157）或 `--browser "<chrome.exe 绝对路径>"`，均已实测可用 |

脚本会按顺序解析 Playwright：`FE_VERIFY_PLAYWRIGHT` → 当前目录/脚本目录的 `node_modules` → `%APPDATA%\npm\node_modules\playwright` → `~/.npm-global/...` → `/usr/lib/node_modules/...` → `npm root -g`。全部失败时以退出码 2 输出安装提示。**不要为此安装新依赖或联网安装**；已有本机安装就够。

`--out` 不传时写到系统临时目录（`%TEMP%\frontend-verification\<时间戳>\`），不会污染仓库；要留档就显式传 `--out .verify/xxx`。

## 命令速查（在仓库根目录执行；`$V` 为脚本路径）

```powershell
$V = "E:\front-google\modern-web-guidance-whllow\.agents\skills\frontend-verification\scripts\verify.mjs"
$B = "E:\front-google\modern-web-guidance-whllow\.agents\skills\frontend-verification\scripts\bench-verify.mjs"
$url = ([System.Uri]("$env:TEMP\my-page\index.html")).AbsoluteUri   # 或 http://localhost:5173/

# 1) 完整验证（最常用）
node $V run --url $url --checks .\checks.json --out .\.verify-run

# 1b) 快速冒烟（PR 前用；只跑 360x800/light，跳过性能/焦点/dialog/基线，PASS ≠ 完整验收）
node $V run --url $url --checks .\checks.json --quick

# 1c) 性能基准（同一夹具重复跑，输出 mean/p50/p95/报告体积；--verify 可 A/B 旧版脚本）
node $B --url $url --runs 3 --checks .\checks.json --label after
node $B --url $url --runs 3 --checks .\checks.json --verify C:\path\to\verify-old.mjs --label before

# 2) 只出一张图（单视口/主题）
node $V shot --url $url --out .\shot-dark.png --viewport 1440x900 --theme dark [--full-page]

# 3) 只查可访问性
node $V a11y --url $url --out .\.a11y-out

# 4) 只看性能（stdout 只输出 JSON）
node $V perf --url $url

# 5) 两张图对比（输出 diff 图；差异 > 阈值时退出码 1）
node $V compare --a .\before.png --b .\after.png --out .\diff.png

# 6) 基线视觉回归：第一次把截图目录留作基线，改完后对比
node $V run --url $url --out .\.verify-before --no-fail
node $V run --url $url --out .\.verify-after --baseline .\.verify-before\screenshots

# 备用浏览器（默认可跳过）
node $V run --url $url --browser chrome
node $V run --url $url --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

`run` 常用参数：`--viewports 360x800,768x1024,1440x900`、`--theme light,dark`、`--quick`（快速通道，见下节）、`--concurrency 1-8`（视口×主题并发数，默认 `min(4, 采集数)`）、`--pixel-threshold 0.1`（基线差异百分比阈值）、`--channel-threshold 32`（单通道像素差）、`--wait 400`（加载后额外等待 ms）、`--wait-for "#app"`、`--no-fail`（有阻断项也退出 0，报告仍 FAIL）。

退出码约定：`0` = 通过；`1` = 有阻断项（`run`/`a11y`/`compare`）；`2` = 参数或工具错误（含 Playwright/浏览器不可用）。

## checks DSL（断言文件）

文件是 JSON 数组（或 `{ "checks": [...] }`）。`run --checks <file>` 在**主采集视口**（第一个 `--viewports` × 第一个 `--theme`，默认 `360x800 / light`）执行；每条断言输出 selector、期望、实际、是否通过。断言失败 → 计入阻断项。

```json
[
  { "label": "保存按钮存在",       "selector": "#save",          "exists": true },
  { "label": "只有一个 dialog",    "selector": "dialog",         "count": 1 },
  { "label": "dialog 已打开",      "selector": "dialog",         "computed": { "display": "block" } },
  { "label": "提示文案正确",       "selector": ".toast",         "textContains": "已保存" },
  { "label": "图标按钮有名称",     "selector": "#save",          "attribute": { "aria-label": "保存" } },
  { "label": "模态层可见",         "selector": ".modal",         "hidden": false },
  { "label": "URL 不含错误标记",   "urlNotContains": "error" }
]
```

字段语义：

| 字段 | 判断 | 证据 |
| --- | --- | --- |
| `selector` | CSS 选择器（必填，`urlNotContains` 除外） | 首个匹配元素的 CSS 路径 |
| `exists` | 匹配数 > 0 是否为期望值 | 匹配数量、首个元素 HTML |
| `count` | 匹配数量严格等于 | 匹配数量与选择器列表 |
| `computed` | `getComputedStyle` 实际值严格等于期望（值用序列化后的字符串，如 `"rgb(11, 87, 208)"`、`"block"`、`"320px"`） | `evidence.computed` 实际值 |
| `textContains` | `textContent` 归一化后包含 | 实际文本 |
| `attribute` | 每个属性 `getAttribute` 严格等于期望（缺失为 `null`） | `evidence.attributes` |
| `hidden` | 是否隐藏（`checkVisibility` / display / visibility / 无布局盒） | `evidence.hidden` |
| `urlNotContains` | 当前 URL 不包含子串 | 实际 URL |

注意：`computed` 比较的是**计算后的字符串**，不要写 `#fff`（应为 `rgb(255, 255, 255)`）或 `block !important`。选择器匹配多元素时断言用首个元素（`count` 除外）。

## 自动检查项（无需 checks 文件也会跑）

- **console / pageerror / requestfailed**：按问题去重，保留每次出现的阶段与原文；`console.error`、未捕获异常、网络请求失败都算阻断项（warn 不算）。
- **a11y**：img 无 alt、button/link 无可访问名称、表单控件无 label、重复 id、标题层级跳级、`aria-hidden` 含可聚焦元素、dialog 无名称/无关闭方式。
- **dialog 行为**：`showModal()` 打开时是否可 Escape 关闭、关闭按钮点击是否真的关闭。
- **横向溢出**：每个视口检查 `scrollWidth > innerWidth + 1`，列出溢元素及其 `right/width`。
- **性能**：navigation timing、FCP、LCP（PerformanceObserver）、CLS（`hadRecentInput=false` 累计，近似口径）、long task 数量。
- **键盘焦点**：`Tab` 走查序列，检查每个停留元素的 `:focus-visible`、outline/box-shadow 是否可见；modal 打开时走查一次，仅当 dialog 被成功关闭后再走查一次（未关闭则记 `focusAfterDialogSkipped`，不重复走查）。
- **基线**：`--baseline` 时按同名截图做 canvas 像素对比，输出 `diffPercent` 与 diff 图；尺寸不一致或超阈值即失败。

## 运行模式与性能（v1.1）

两种模式，报告里用 `report.mode` 区分；完整模式把每个阶段的耗时写进 `report.timings`，每个 pass 有 `loadMs` / `collectMs`。

| 模式 | 采集范围 | 适用 | 证据边界 |
| --- | --- | --- | --- |
| `full`（默认） | 6 个「视口 × 主题」并发采集 + 主采集串行跑 checks/perf/focus/dialog | 交付前验收、看证据 | 完整；`PASS` 可作验收依据 |
| `--quick` | 仅 `360x800 / light`，1 张截图；跑 console/a11y/overflow/checks | PR 前冒烟、改一行 CSS 后的回归 | 跳过 perf/focus/focusAfterDialog/dialog/baseline；`report.mode='quick'`、警告 `quick-mode`、`pass.skipped` 列出跳过项；**quick PASS ≠ 完整验收** |

- **并发**：默认 `min(4, 采集数)`（6 个采集 → 4），可用 `--concurrency 1-8` 覆盖；`--quick` 固定 1。实测 6 并发比 4 并发更慢（进程/浏览器竞争），**不建议调高**；低核机器降到 2。
- **实测提速**（夹具 `%TEMP%\fe-verify-perf\index.html`，32 逻辑核，Playwright chromium 153，`bench-verify.mjs` 同机 A/B）：
  - 旧版 full：3 次 mean 7495ms / p50 7421ms；新版 full（并发 4）：5 次 mean 3239ms / p50 3190ms / p95 3417ms → **−56.8%**；同日另两轮采样为 2741ms（−62.0%）与 3351ms（−53.6%），说明机器负载会让绝对值波动 ±10%，同窗口 A/B 才可信。
  - `--quick`：3 次 mean 1831ms → 相对旧版 full **−75.6%**。
  - 报告体积 +2.3%（32,187 → 32,932 B，新增 mode/timings/skipped 字段）；截图数量不变（full 6 张 / quick 1 张）；旧版与新版在 fixed 夹具上 6 张截图**逐字节相同**（像素无回归）。
- **提速来源**：6 个 pass 有界并发（原来是串行）；dialog 关闭后的焦点走查只在 dialog 确实关闭后执行；焦点走查每步 settle 80→40ms；dialog Escape/关闭等待 150/100/150→100/60/100ms。
- **代价与风险**：焦点走查 settle 40ms 对「带 CSS transition 的自定义 focus ring」可能采在过渡中间（outline/box-shadow 实际值仍会写进报告）；这类页面加 `--wait` 或在交付前人工复核。并发会改变时序：依赖跨页面共享状态（同一 localStorage 写入竞争、固定端口单例）的页面用 `--concurrency 1` 串行。`--quick` 必须如实报告覆盖边界，禁止把 quick PASS 写成完整验收。

## PASS / FAIL 判定

`report.verdict` 与退出码一致：

- **FAIL**：`console.error` > 0、pageerror > 0、requestfailed > 0、任一 a11y 阻断项、任一视口横向溢出、任一 checks 失败、dialog 行为失败、焦点环缺失、基线差异超阈值或尺寸不一致。
- **PASS**：以上全部为 0（警告不等于失败，如「基线缺少同名截图」只记为 warning）。
- 有 `--no-fail` 时退出码仍为 0，但 `verdict` 不变，交付时不能用它当通过证据。

修到 PASS 之后，仍要人工对照 `references/checklists.md` 覆盖自动检查抓不到的部分（对比度具体值、reduced-motion、粘性头部遮挡、懒加载占位等）。

## 如何把结果反馈给开发 Agent

修复请求不要只说“没通过”，把证据原样给它：

```markdown
## 验收结论：FAIL（阻断项 N）
命令: node .agents/skills/frontend-verification/scripts/verify.mjs run --url <url> --checks <checks.json> --out <out>
退出码: 1
报告: <out>/report.md / report.json

### 阻断项（按 report.failures 顺序）
1. [console-error] <console 原文> @ <阶段> — 证据 <截图绝对路径>
2. [a11y:img-missing-alt] #hero <img> 缺少 alt — 证据 <report.md 行片段>
3. [horizontal-overflow] 360x800: 文档宽 376 > 视口 360，溢元素 #wide-panel（right=376, width=320）
4. [check-failed] #save 期望 {"aria-label":"保存"}，实际 null
5. [dialog-close-fails] 对话框关闭按钮点击后仍打开

### 修复要求
- 只改上面证据指向的元素/样式，不要顺手重构无关代码。
- 修完重跑同一条命令到 PASS，并把 report.md 路径贴回来。
```

## 常见坑（实测踩过）

1. **截图抖动**：动画/光标会导致像素差异；脚本已用 `animations: 'disabled'` + `caret: 'hide'`，页面自身仍应在稳定态再截（`--wait` / `--wait-for`）。
2. **file:// URL 写法**：Windows 路径必须转成 `file:///C:/...`（正斜杠）；`index.html` 里的相对资源若缺失会被记为 requestfailed，这是真实缺陷，不要过滤掉。
3. **headless 与 headed 结果可能不同**（尤其 hover/媒体查询/滚动条）；有疑问时加 `--headed` 人工复核。
4. **`showModal()` 自动弹窗的页面**：主采集时 Tab 序列会被焦点陷阱限制在对话框内，这是预期的；脚本在 Escape/关闭按钮**成功关闭**后再走查一次整页焦点序列；如果 dialog 关不掉，第二次走查会跳过并在 `focusAfterDialogSkipped` 说明原因（此时 dialog 行为本身已是阻断项）。
5. **基线第一次跑必然“没有基线”**：先把一次达标截图目录留作 baseline，之后改动才有回归意义；不要拿包含缺陷的截图当基线还声称通过。
6. **CLS 是近似值**：脚本累计所有 `hadRecentInput=false` 的 layout-shift，不是完整 Session Window 口径；要严格口径用 Lighthouse/Sentry 复核。
7. **不是 oracle**：自动检查只覆盖常见问题；`references/checklists.md` 里的对比度数值、`prefers-reduced-motion`、滚动相关缺陷需要按清单补测。
8. **别改仓库其他文件**：验证产物写到 `--out` 指定目录或系统临时目录。

## 参考文件

- `references/checklists.md`：按 UI 类型的验收清单（对话框、表单、表格、导航、暗色模式、动画、滚动、图片、a11y、性能、安全、Chrome 扩展），每条都是可执行动作（选择器/计算样式/命令）。
- `references/example-report.md`：本机实测的「修复前 FAIL → 修复后 PASS」真实报告节选，含真实退出码、截图路径与 diff 数据，可作为报告写法样例。
