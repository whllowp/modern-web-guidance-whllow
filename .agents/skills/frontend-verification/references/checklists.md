# 前端验收清单（按 UI 类型）

用法：先跑 `node .agents/skills/frontend-verification/scripts/verify.mjs run --url <url> --checks <checks.json>` 拿到自动检查结果，
再按下面清单逐条补测自动检查覆盖不到的部分。每条都给出「怎么验」的可执行动作；`$V` 为 verify.mjs 路径，`$url` 为目标 URL。

```powershell
$V = "E:\front-google\modern-web-guidance-whllow\.agents\skills\frontend-verification\scripts\verify.mjs"
```

> 通用原则：能用「真实浏览器 + 计算样式/截图/console」证明的，就不要用“看代码觉得对”代替。

---

## 1. 对话框 / 弹出层（dialog / popover / modal）

自动已覆盖：`dialog` 可访问名称、是否有带名称的关闭控件、`showModal()` 下 Escape 是否关闭、关闭按钮点击是否真的关闭、焦点环。

补充动作：

1. **打开路径真实**：真实点击触发按钮，不要只 `showModal()` 注入。checks：
   ```json
   { "selector": "#open-settings", "exists": true },
   { "selector": "dialog[open]", "count": 1 },
   { "selector": "dialog[open]", "computed": { "display": "block" } }
   ```
2. **焦点进入与返回**：打开后 `document.activeElement` 应落在对话框内首个可聚焦元素；关闭后焦点回到触发按钮。用 `run` 的 `focus` 段看 Tab 序列，或 headed 模式人工确认。
3. **背景不可交互**：模态时 `document.querySelectorAll('dialog:modal').length === 1`；点背景是否关闭按产品要求（light-dismiss）验证：`page.mouse.click(5,5)` 后检查 `dialog[open]`。
4. **滚动锁定**：打开时 `document.documentElement.style.overflow` 或 body 是否 `hidden`；关闭后恢复。
5. **可访问名称**：`<dialog aria-labelledby="title-id">` 或 `aria-label`；不能用 dialog 内文本自动当名称。
6. **关闭方式全覆盖**：Escape、关闭按钮、确认/取消按钮、点遮罩（若支持），4 条路径都点一遍。
7. **视觉证据**：`run` 截图或 `shot --url $url --out dialog.png`，确认遮罩层级、不裁切、移动端 360 宽度不溢出。

常见缺陷：无 aria-labelledby、关闭按钮只有 `×` 且无 aria-label、Escape 不关闭、打开后焦点仍在背景、关闭后焦点丢失、移动端 dialog 超出视口。

## 2. 表单与校验

自动已覆盖：表单控件是否有 label / aria-label、可访问名称。

补充动作：

1. **每个字段都有可见 label**：`label[for]` 或包裹式 label；placeholder 不能替代 label。checks：
   ```json
   { "selector": "#email", "attribute": { "aria-label": "邮箱" } },
   { "selector": "label[for='email']", "textContains": "邮箱" }
   ```
2. **错误态真实触发**：提交空表单/非法值后，检查错误文案与 `aria-invalid`、`aria-describedby`：
   ```json
   { "selector": "#email", "attribute": { "aria-invalid": "true" } },
   { "selector": "#email-error", "textContains": "请输入有效邮箱" }
   ```
3. **焦点管理**：提交失败后焦点是否移到首个错误字段；错误信息是否被 `aria-live` 播报。
4. **autofill / 输入法**：`autocomplete` 属性正确（email/tel/name/one-time-code），日期/电话用正确 `type` 与 `inputmode`。
5. **禁用与 loading**：提交中按钮 `disabled` 且 `aria-busy`，防止重复提交。
6. **计算样式**：错误边框/颜色确实变化，例如 `{"selector":"#email","computed":{"borderTopColor":"rgb(179, 38, 30)"}}`（以你的设计 token 实际值为准）。
7. **键盘**：Enter 提交、Tab 顺序符合视觉顺序、不得用 `tabindex` 正数重排。

## 3. 表格

1. **语义**：`<table>` + `<th scope="col|row">` + `<caption>`；不要用 div 拼表。
2. **响应式**：360 视口无横向溢出；需要横滚时容器 `overflow-x:auto` 且可键盘滚动（`tabindex="0"` + 可见提示）。checks：
   ```json
   { "selector": ".table-wrap", "computed": { "overflowX": "auto" } }
   ```
3. **排序/筛选状态**：排序后 `aria-sort` 正确（`ascending|descending|none`）；筛选结果数量可断言。
4. **大表性能**：>200 行时用 `perf` 比较加载前后，或用 `run --baseline` 看是否明显掉帧（long task 数量）。
5. **空态/加载态/错误态**：分别截图，确认文案与骨架屏。

## 4. 导航 / 菜单

1. **可访问名称**：`<nav aria-label="主导航">`；菜单按钮 `aria-expanded` 随开关变化：
   ```json
   { "selector": "#menu-btn", "attribute": { "aria-expanded": "false" } }
   ```
2. **键盘操作**：Enter/Space 打开、Esc 关闭、方向键在菜单项间移动（按产品约定验证），焦点不能丢。
3. **移动端**：360 视口下汉堡菜单可用、打开后背景锁定、关闭后焦点回到按钮。
4. **当前页标记**：`aria-current="page"` 或在视觉上有明确当前态。
5. **点击区域**：触摸目标 ≥ 24×24 CSS px（推荐 44×44），用 `getBoundingClientRect()` 抽查。

## 5. 暗色模式与对比度

1. **跟随系统 + 手动切换**：`run --theme light,dark` 各视口截图；`prefers-color-scheme` 分支必须真实存在。
2. **手动切换持久化**：切换后刷新页面仍保持；`<html data-theme>` / class 与 `color-scheme` 同步：
   ```json
   { "selector": "html", "attribute": { "data-theme": "dark" } }
   ```
3. **对比度**：正文 ≥ 4.5:1，大字/非文本 UI ≥ 3:1。用浏览器计算样式取值后自己算，或 DevTools/axe：
   ```js
   // 在 run 页面上下文里取实际色值，再按 WCAG 公式算
   getComputedStyle(document.querySelector('body')).color
   ```
   注意暗色下“深灰字 + 深灰底”是最常见失败。
4. **图片/图标/阴影**：检查暗色下是否仍是浅色背景图、阴影是否消失、focus ring 是否可见。
5. **color-scheme**：表单控件、滚动条在暗色下不应仍是白底（`color-scheme: light dark`）。

## 6. 动画与 reduced-motion

1. **尊重 prefers-reduced-motion**：在 `run` 之外单独用 `shot` 无法模拟；headed 模式开系统设置，或页面提供开关。检查对应媒体查询分支存在且动画被禁用。
2. **不阻塞内容**：动画不得延迟 LCP 文本渲染；`perf` 的 FCP/LCP 与 long task 数量做前后对比。
3. **可中断**：hover/focus 动画不导致布局抖动（CLS 断言近 0）。
4. **截图稳定**：`run` 已用 `animations: 'disabled'`；持续动画（轮播/spinner）会让基线像素对比抖动，必要时先 `--wait-for` 等稳定态或用 CSS 在验证环境暂停动画。
5. **过渡时长**：`getComputedStyle(el).transitionDuration` 与 token 一致，不要出现 0.01s/10s 异常值。

## 7. 滚动与粘性（sticky / fixed）

1. **粘性头部遮挡**：滚动到锚点后，标题不能被 sticky header 盖住；用 `scroll-margin-top` 或锚点偏移，人工截图确认。
2. **滚动锁定**：打开抽屉/对话框时 body 不可滚；关闭后恢复原滚动位置。
3. **锚点跳转**：点击导航后 `location.hash` 正确、目标元素在视口内（`getBoundingClientRect().top >= 0`）。
4. **横向滚动容器**：内部可滚、页面不跟着横向溢出；`run` 的横向溢出检查应覆盖 360 视口。
5. **性能**：滚动驱动动画/吸顶监听不得产生大量 long task（`perf` 的 `longTasks`）。

## 8. 图片与懒加载

1. **尺寸与布局**：`width`/`height` 或 `aspect-ratio` 已设置，避免 CLS；`run` 的 CLS 应为 0 或极小。
2. **alt 完整**：内容图有描述性 alt，装饰图 `alt=""`；图标按钮的 svg 加 `aria-hidden="true" focusable="false"`。
3. **懒加载**：首屏图不要 `loading="lazy"`；首屏大图 `fetchpriority="high"`；非首屏 `loading="lazy"` + `decoding="async"`。
4. **错误兜底**：断网/404 时 alt 文案与占位可见；`run` 会把缺失资源记为 requestfailed（真实缺陷）。
5. **响应式图**：`srcset`/`sizes` 与 DPR 匹配；暗色下图片是否需要换图。
6. **验证动作**：
   ```json
   { "selector": "#hero", "attribute": { "loading": "eager" } },
   { "selector": "#hero", "exists": true }
   ```
   并用 `perf` 确认 LCP 元素/时间合理。

## 9. 可访问性（a11y）通用

自动已覆盖：img alt、按钮/链接名称、label、重复 id、标题跳级、aria-hidden 聚焦、dialog 语义、焦点环。

补充动作：

1. **语义结构**：一个 h1、标题按层级、landmark（header/nav/main/footer）齐全。
2. **可访问名称**：图标按钮、仅图片链接必须有 `aria-label`（代码层面检查 `rg '<button[^>]*>\s*<svg'`）。
3. **状态类 ARIA**：`aria-expanded`、`aria-checked`、`aria-selected`、`aria-pressed` 随交互变化，不能写死。
4. **live region**：toast/错误提示 `role="status"`/`aria-live="polite"`，不要用 `display:none` 的首屏播报。
5. **键盘可达**：所有交互元素可 Tab 到、可 Esc 退出；自定义控件（下拉、tabs、switch）实现键盘语义。
6. **不要移除焦点环**：`outline: none` 必须配替代可见焦点样式；自动焦点走查会报 `focus-ring-missing`。
7. **放大 200%**：`--viewport 720x450` 模拟 200% 缩放，确认无裁切/横向溢出。
8. 需要更深的规则扫描时用 axe-core（若本机已装；本技能不强制安装），把结果与 `report.json` 交叉核对。

## 10. 性能

自动已覆盖：TTFB、DOMContentLoaded、Load、FCP、LCP、CLS（近似）、long task 数量。

补充动作：

1. **冷启动多跑几次**：`perf` 重复 3 次取中位数（file:// 与 dev server 数值都偏低，别拿本地绝对值和线上比）。
2. **LCP 元素判定**：`perf` 输出 `lcpElement`，确认它真的是首屏主图/主标题，而不是被弹窗或动画抢走。
3. **资源体积**：`run` 的 `perf.transferSize` / `resourceCount` 做改动前后对比；大图/字体是否走压缩与子集。
4. **长任务**：交互（打开菜单、提交表单）后再看 `longTasks` 是否增加；>50ms 的任务要定位。
5. **字体**：`font-display: swap/optional`，避免 FOIT；`document.fonts.ready` 后截图稳定。
6. **对比基线**：`run --baseline <上次截图目录>` 是最直观的性能/视觉回归；性能数值用 `compare` 无法覆盖，需人工记录。

## 11. 安全 / HTML 注入

1. **不可信内容转义**：搜索词、URL 参数、用户名回显必须 `textContent`/模板转义，禁止 `innerHTML` 拼接用户输入。
2. **XSS 探测**：用 `?q=<img src=x onerror=console.error('xss')>` 打开页面，`run`/`a11y` 不应出现新的 console.error，也不应有未预期的 `<img>` 注入。
3. **URL 协议**：用户可控的 `href`/`src` 禁止 `javascript:`；外链加 `rel="noopener noreferrer"`（`target="_blank"`）。
4. **CSP 头**：远程页面用 `curl -I` / DevTools 确认 CSP 存在且 console 无 CSP 违规（CSP 违规会以 console error 出现，`run` 能抓到）。
5. **敏感信息**：不要把 token/邮箱/手机号硬编码进页面源码或截图；报告截图脱敏后再外发。

## 12. Chrome 扩展页面（popup / options / side panel / content script UI）

扩展页面没有 dev server，验证方式不同：

1. **popup/options 用 extension 内相对 URL**：先 `chrome-extension://<id>/popup.html`；没有已加载扩展时，把 `popup.html` 当作 `file://` 页面验证静态部分（脚本里 `chrome.*` API 会报错，属于环境限制，要在报告里注明）。
2. **真实环境验证**：`chrome://extensions` 加载解压扩展，或 `chrome --load-extension=<dir> --user-data-dir=<temp>` 启动；用 Playwright 的 `launchPersistentContext`（需要时用 `shot`/`run` 的自定义 URL 不行，应写一次性脚本，并在报告注明验证级别）。
3. **尺寸约束**：popup 宽度 320–800，`run --viewports 360x800` 检查是否溢出；side panel 宽度可变，验 320/480/800。
4. **权限与 API 失败态**：拒绝权限、离线、API 报错时 UI 是否有兜底文案（扩展页面常直接白屏）。
5. **manifest 相关**：CSP 禁止内联脚本，检查 console 是否出现 `Refused to execute inline script`。
6. **暗色/主题**：扩展页面同样要跑 `--theme light,dark`；Chrome 扩展页面默认浅色，需要显式 `color-scheme`。
7. **交付口径**：注明「扩展 API 在 file:// 下不可用，本次只验证 UI 静态部分」或「已在真实扩展环境验证」，不能混写。

---

## 通用收尾检查

- [ ] `report.verdict === "PASS"`，退出码 0；`report.failures` 为空。
- [ ] 至少一张改动后的真实截图（绝对路径）已贴进交付说明。
- [ ] console 无 error；网络无失败请求。
- [ ] 360 / 768 / 1440 三档无横向溢出。
- [ ] 明暗两套主题都截图过，没有被忽略的暗色缺陷。
- [ ] 与本次检索到的指南 DO/DON'T 逐条对照过。
- [ ] 报告和截图路径可复现（命令 + URL + 退出码齐全）。
