# 真实报告示例：修复前 FAIL → 修复后 PASS（本机实测，已脱敏）

> 本文件是 `frontend-verification` skill 的自测产物节选，所有数据来自本机真实执行，不是手工编造。
> 脱敏处理：用户目录替换为 `%TEMP%`、仓库路径替换为 `<repo>`；截图与报告文件名保持原样，方便对照字段结构。

## 环境

- Windows 11 + PowerShell 7，Node v22.22.1，npm 10.9.4
- 浏览器：Playwright 自带 Chromium `153.0.8010.12`，启动方式 `playwright-bundled-chromium`
- Playwright 模块：`%APPDATA%\npm\node_modules\playwright`（1.63.0），浏览器缓存 `%LOCALAPPDATA%\ms-playwright\chromium-1243`
- 目标页面：缺陷版 `file:///%TEMP%/fe-verify-fixture/index.defect.html`，修复版 `file:///%TEMP%/fe-verify-fixture/index.html`（无 dev server，纯 file:// 场景）
- 夹具故意包含：`<img>` 无 alt、纯图标 `<button>` 无可访问名称、`console.error`、`showModal()` 打开的 `<dialog>`、`prefers-color-scheme: dark` 分支、固定 `width: 320px` 导致 360 视口横向溢出的元素；另有表单无 label、重复 id、标题跳级、缺失图片资源作为补充缺陷。

## 命令与退出码

```powershell
$V = "<repo>\.agents\skills\frontend-verification\scripts\verify.mjs"
$defectUrl = ([System.Uri]("%TEMP%\fe-verify-fixture\index.defect.html")).AbsoluteUri
$fixedUrl  = ([System.Uri]("%TEMP%\fe-verify-fixture\index.html")).AbsoluteUri

# 修复前（缺陷版页面）
node $V run --url $defectUrl --checks "%TEMP%\fe-verify-fixture\checks.json" --out "%TEMP%\fe-verify-fixture\run-defect"
# → 退出码 1（FAIL，阻断项 16）

# 修复后（修复版页面）
node $V run --url $fixedUrl --checks "%TEMP%\fe-verify-fixture\checks.json" --out "%TEMP%\fe-verify-fixture\run-fixed"
# → 退出码 0（PASS，阻断项 0）

# 以修复前截图为基线，验证修复后差异可被量化
node $V run --url $fixedUrl --out "%TEMP%\fe-verify-fixture\run-fixed-vs-defect" `
  --baseline "%TEMP%\fe-verify-fixture\baseline-defect" --viewports 360x800,1440x900 --theme light,dark --no-fail
# → --no-fail 退出码 0，但报告 verdict=FAIL：4 个基线失败（2 个像素差异 + 2 个尺寸不一致）

# 同一页面重复验证，确认基线可复现
node $V run --url $fixedUrl --out "%TEMP%\fe-verify-fixture\run-fixed-vs-fixed" `
  --baseline "%TEMP%\fe-verify-fixture\baseline-fixed" --viewports 360x800,1440x900 --theme light,dark
# → 退出码 0（PASS），4 张截图 diffPercent 全部 0
```

## 修复前：FAIL（退出码 1）

stdout 摘要（真实输出）：

```text
=== frontend-verification 验证摘要 ===
目标 URL : file:///%TEMP%/fe-verify-fixture/index.defect.html
结论     : FAIL（阻断项 16）
统计     : 控制台错误 2 | 页面异常 0 | 请求失败 1 | a11y 8 | 溢出视口 1 | 断言失败 4 | 基线失败 0
浏览器   : chromium 153.0.8010.12（playwright-bundled-chromium）
报告     : %TEMP%\fe-verify-fixture\run-defect\report.md
机器可读 : %TEMP%\fe-verify-fixture\run-defect\report.json
--- 阻断项（最多显示 15 条，按问题去重）---
- [console-error] 控制台错误: Failed to load resource: net::ERR_FILE_NOT_FOUND（6 个阶段）
- [console-error] 控制台错误: [fixture] 模拟业务错误：POST /api/save 返回 500（6 个阶段）
- [request-failure] 请求失败: .../missing-asset.png（net::ERR_FILE_NOT_FOUND）
- [a11y:img-missing-alt] [图片缺少 alt] <img> 缺少 alt 属性（装饰性图片也应显式写 alt=""）
- [a11y:control-no-accessible-name] [按钮/链接缺少可访问名称] 按钮缺少可访问名称（…）
- [a11y:form-control-no-label] [表单控件缺少标签] 表单控件缺少关联 label / aria-label / aria-labelledby（…）
- [a11y:duplicate-id] [重复 id] id="dup" 在文档中出现 2 次
- [a11y:heading-skip] [标题层级跳级] 标题层级从 h1 跳到 h3
- [a11y:aria-hidden-focusable] [aria-hidden 容器内含可聚焦元素]（…）
- [a11y:dialog-no-name] [对话框缺少可访问名称] <dialog> 缺少可访问名称（aria-label 或 aria-labelledby）
- [horizontal-overflow] 横向溢出: 文档宽 376px > 视口 360px（360x800 / light，360x800 / dark）
- [check-failed] 断言失败: #save — {"aria-label":"保存"}
- [check-failed] 断言失败: #hero — {"alt":"示例配图"}
- [check-failed] 断言失败: #confirm-dialog — {"aria-labelledby":"confirm-title"}
- [check-failed] 断言失败: #wide-panel — 文本包含 "自适应"
... 其余 1 条见 report.md
```

### report.md 节选（结论与证据表）

```markdown
# 前端验证报告：未通过

| 项目 | 内容 |
| --- | --- |
| 目标 URL | file:///%TEMP%/fe-verify-fixture/index.defect.html |
| 结论 | **FAIL**（阻断项 16） |
| 执行时间 | 2026-11-16 02:04:19 → 2026-11-16 02:04:28（本地时间，耗时 8s） |
| 浏览器 | chromium 153.0.8010.12，启动方式 `playwright-bundled-chromium` |
| 视口 × 主题 | 360x800/light，360x800/dark，768x1024/light，768x1024/dark，1440x900/light，1440x900/dark |

## 结论
共 **16** 个阻断项（同问题跨视口/主题已去重；原始失败事件 67 条），修复后必须重新执行本命令，直到结论为 PASS。

| # | 类型 | 出现阶段 | 问题 | 证据截图 |
| 1 | console-error | 6 个阶段 | 控制台错误: [fixture] 模拟业务错误：POST /api/save 返回 500 | %TEMP%\fe-verify-fixture\run-defect\screenshots\360x800_light.png |
| 4 | a11y:img-missing-alt | 6 个阶段 | [图片缺少 alt] <img> 缺少 alt 属性（…） | …\screenshots\360x800_light.png |
| 11 | horizontal-overflow | 360x800 / light，360x800 / dark | 横向溢出: 文档宽 376px > 视口 360px | …\screenshots\360x800_light.png |
| 16 | dialog-close-fails | 360x800 / light | 对话框关闭按钮无效 | …\screenshots\360x800_light.png |
```

横向溢出的元素证据（`report.json.layout.overflows[0]`）：

```json
{
  "pass": "360x800 / light",
  "viewportWidth": 360,
  "scrollWidth": 376,
  "offenders": [
    { "selector": "#wide-panel", "tag": "div", "left": 56, "right": 376, "width": 320, "text": "固定 320px 面板（在 360 视口下溢出）" }
  ]
}
```

键盘焦点走查（主采集视口，dialog 打开时）：

```json
{ "label": "360x800 / light（dialog 打开时）", "tabStops": [{ "selector": "#dialog-close", "name": "×", "visibleRing": true }], "cycle": true }
```

对话框行为：

```json
{ "found": true, "open": true, "modal": true, "escapeCloses": true, "closeButtonCloses": false, "closeSelector": "#dialog-close" }
```

> 这说明工具真的点到了关闭按钮：`×` 有可访问名称、能拿到焦点，但没有绑定 `close()`，所以点击无效 → `dialog-close-fails`。这是代码读不出来、必须真实点击才能发现的缺陷。

## 修复内容（对应阻断项）

1. `<img id="hero">` 补 `alt="示例配图"`；
2. 图标按钮补 `aria-label="保存"`（svg 保持 `aria-hidden="true" focusable="false"`）；
3. 删除 `console.error`（改为无副作用初始化）；
4. `<dialog aria-labelledby="confirm-title">`，`h2` 加 `id="confirm-title"`；关闭按钮补 `aria-label="关闭对话框"` 并绑定 `dialog.close()`；
5. 固定 320px 面板改为 `width:100%; max-width:320px`，360 视口不再溢出；
6. 表单补 `<label for="email">`，重复 id 去重，标题 `h3→h2`，移除 `aria-hidden` 内可聚焦按钮，删除缺失的 `missing-asset.png`。

## 修复后：PASS（退出码 0）

stdout 摘要（真实输出）：

```text
=== frontend-verification 验证摘要 ===
结论     : PASS（阻断项 0）
统计     : 控制台错误 0 | 页面异常 0 | 请求失败 0 | a11y 0 | 溢出视口 0 | 断言失败 0 | 基线失败 0
浏览器   : chromium 153.0.8010.12（playwright-bundled-chromium）
报告     : %TEMP%\fe-verify-fixture\run-fixed\report.md
机器可读 : %TEMP%\fe-verify-fixture\run-fixed\report.json
```

`report.json` 关键字段（真实值）：

```json
{
  "verdict": "PASS",
  "summary": {
    "blocking": 0, "consoleErrors": 0, "pageErrors": 0, "requestFailures": 0,
    "a11yViolations": 0, "overflowViewports": 0, "checkFailures": 0, "baselineFailures": 0, "passes": 6
  },
  "perf": { "ttfb": 0, "domContentLoaded": 93, "fcp": 120, "lcp": 120, "lcpElement": "p", "cls": 0, "longTasks": 1 },
  "focus": { "tabStops": [{ "selector": "#dialog-close", "name": "关闭对话框", "visibleRing": true }], "cycle": true },
  "dialog": { "found": true, "open": true, "modal": true, "escapeCloses": true, "closeButtonCloses": true },
  "checks": { "total": 9, "passed": 9, "failed": 0 }
}
```

dialog 关闭后的整页 Tab 序列（证明焦点可走查、焦点环可见）：

```json
[
  { "selector": "html > body > nav > a:nth-of-type(1)", "name": "面板", "visibleRing": true },
  { "selector": "html > body > nav > a:nth-of-type(2)", "name": "表单", "visibleRing": true },
  { "selector": "#save", "name": "保存", "visibleRing": true },
  { "selector": "#email", "name": "邮箱", "visibleRing": true }
]
```

截图证据（绝对路径，真实生成）：

| 阶段 | 截图 |
| --- | --- |
| 360x800/light | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\360x800_light.png` |
| 360x800/dark | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\360x800_dark.png` |
| 768x1024/light | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\768x1024_light.png` |
| 768x1024/dark | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\768x1024_dark.png` |
| 1440x900/light | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\1440x900_light.png` |
| 1440x900/dark | `%TEMP%\fe-verify-fixture\run-fixed\screenshots\1440x900_dark.png` |

修复前 360x800 截图实际是 376×800（因为整页被 320px 面板撑宽），修复后是 360×800；这也是基线尺寸不一致能抓到的原因。

## 基线（视觉回归）实测

`--baseline` 指向修复前截图目录时：

```json
{
  "1440x900_light.png": { "diffPercent": 1.9052, "sizeMismatch": false, "ok": false },
  "1440x900_dark.png":  { "diffPercent": 1.7457, "sizeMismatch": false, "ok": false },
  "360x800_light.png":  { "diffPercent": 6.5462, "sizeMismatch": true,  "ok": false },
  "360x800_dark.png":   { "diffPercent": 10.258, "sizeMismatch": true,  "ok": false }
}
```

同一修复版重复跑、基线指向修复后截图目录时：

```json
{
  "1440x900_light.png": { "diffPercent": 0, "ok": true },
  "1440x900_dark.png":  { "diffPercent": 0, "ok": true },
  "360x800_light.png":  { "diffPercent": 0, "ok": true },
  "360x800_dark.png":   { "diffPercent": 0, "ok": true }
}
```

说明：本机 file:// + `animations: disabled` 渲染稳定，基线像素差异可复现为 0；真实项目若有动画/远程字体，需先 `--wait` 到稳定态，或调高 `--pixel-threshold`。

## 其它子命令实测（修复前页面）

```text
# shot：单张截图，退出码 0
node $V shot --url $defectUrl --out "%TEMP%\fe-verify-fixture\shot-light.png" --viewport 1440x900 --theme light
→ { "ok": true, "path": "...\\shot-light.png", "bytes": 40922, "browser": { "version": "153.0.8010.12" } }

# compare：明暗两张截图差异，退出码 1（差异 99.7481%）
node $V compare --a "%TEMP%\...\shot-light.png" --b "%TEMP%\...\shot-dark.png" --out "%TEMP%\...\diff-light-dark.png"
→ { "diffPixels": 1292736, "totalPixels": 1296000, "diffPercent": 99.7481, "pass": false, "diffPath": "...\\diff-light-dark.png" }

# compare：同一文件对比，退出码 0
node $V compare --a "%TEMP%\...\shot-light.png" --b "%TEMP%\...\shot-light.png"
→ { "identical": true, "diffPercent": 0, "pass": true }

# a11y：仅 a11y，发现 7 条阻断项，退出码 1
node $V a11y --url $defectUrl --out "%TEMP%\fe-verify-fixture\a11y-out"
→ { "counts": { "violations": 7 } }，退出码 1；加 --no-fail 后退出码 0（报告不变）

# perf：只输出性能 JSON，退出码 0
node $V perf --url $defectUrl
→ { "metrics": { "ttfb": 0, "domContentLoaded": 98, "fcp": 152, "lcp": 152, "lcpElement": "p", "cls": 0, "longTasks": 1 } }

# 备用浏览器：channel 与可执行文件路径均可用
node $V shot --url $defectUrl --out ... --browser chrome
→ { "browser": { "version": "157.0.8103.52", "launchStrategy": "channel:chrome" } }
node $V shot --url $defectUrl --out ... --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
→ { "browser": { "version": "157.0.8103.52", "launchStrategy": "executable:C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" } }
```

## 本机限制与结论

- `file://` 页面无法验证需要 dev server 的 API/登录态；但静态 UI、console、a11y、dialog、响应式、性能指标均可验证（本示例即是）。
- Playwright 1.63 默认要 Chromium revision 1243，本机缓存已具备；缺失时脚本会自动回退本机 Chrome，否则退出码 2 并给出安装提示。
- 自动检查不是 oracle：对比度具体值、reduced-motion、粘性遮挡等按 `references/checklists.md` 补测。
- 结论：修复前 `FAIL`（16 个去重阻断项）→ 修复后 `PASS`（0 阻断项），三次运行退出码分别为 1 / 0 / 0，报告、截图、diff 图均为真实生成文件。
