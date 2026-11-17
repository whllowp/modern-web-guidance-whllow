# Knowledge Map — Agent 精准检索地图

> 用途：让任意 Agent 在 30 秒内从 209 篇指南 + 22 篇扩展参考中定位到「该读哪几篇」。
> 配套：[项目总结](PROJECT-OVERVIEW.md) · [路由 SKILL](../.agents/skills/modern-web-guidance-router/SKILL.md) · [自动生成的逐条路由表](../.agents/skills/modern-web-guidance-router/references/intent-routes.md)

---

## 0. 三层知识结构

| 层 | 资产 | 何时用 | 怎么找 |
| :--- | :--- | :--- | :--- |
| **L1 路由层** | 本文件 + `mwg.mjs search/map/cats` + `references/intent-routes.md` + `zh-glossary.json` | 任务开始时第一件事 | 关键词/中文意图 → 候选 id |
| **L2 指南层** | 209 篇 `<category>/<id>.md`，其中 12 篇纪律型 | 确定 id 后读全文 | `mwg.mjs retrieve "<id>"` 或直接读文件 |
| **L3 验收层** | 指南内 DO/DON'T、强制片段、Baseline 说明 + `frontend-verification` skill | 写完后逐条核对、真机验收 | 见第 6 节 |

**铁律**：先 `search`，再 `retrieve`，再写代码；禁止凭记忆写现代 Web API，禁止编造 id。

---

## 1. 分类索引（17 类 · 209 篇）

`mwg.mjs cats` / `mwg.mjs map <category>` 可随时查看逐条列表。

| 分类 | 篇数 | 代表性 id | 典型中文触发词 |
| :--- | :---: | :--- | :--- |
| `ui-components` | 22 | `dialog` `tabs` `carousel` `accordion` `navigation-drawer` `toast`(persistent-toast-notifications) `navbar` `toolbar` `menu` `breadcrumbs` `progress` | 对话框/模态框/弹窗、标签页、轮播、手风琴、抽屉、通知、导航栏、工具栏、菜单、面包屑、进度条 |
| `ui-behaviors` | 40 | `light-dismiss-a-dialog` `animate-to-from-top-layer` `prevent-page-scroll-under-modal-dialog` `scroll-snap-*` `parallax-scroll-effects` `swipe-to-reveal` `drag-and-drop` `sortable-table` `view transitions`(same/cross-document) `anchor-positioning-tab-underline` `motion` | 点击外部关闭、弹层动画、滚动锁定、滚动吸附、视差、滑动操作、拖放、排序、视图过渡、锚点定位下划线、动效 |
| `ui-atoms` | 13 | `responsive-table` `position-aware-tooltips` `viewport-aware-dropdowns` `scroll-progress-indicator` `shrinking-header-on-scroll` `single-line-overflow` `icons` | 响应式表格、提示框定位、下拉定位、阅读进度、吸顶头部收缩、单行省略、图标 |
| `css` | 18 | `css`(架构) `css-layout` `size-aware-styling` `responsive-design` `child-state-based-styling`(has) `style-parent-with-has` `fluid-scaling` `animate-to-intrinsic-sizes` `design-token-reactivity` `individual-transform-properties` | CSS 架构、现代布局、容器查询、响应式、:has 父选择、流体字号、高度自适应动画、设计令牌、独立 transform |
| `forms` | 19 | `forms`(架构) `validate-input-after-interaction` `required-field-feedback` `autofill-*`(address/payment/sign-in/sign-up/highlight) `custom-select-picker-layouts` `branded-select-styling` `switch` `slider` `sms-otp-form` `ime-safe-enter-submit` | 表单规范、交互后校验、必填反馈、自动填充（地址/支付/登录/注册/高亮）、自定义选择器、开关、滑块、短信验证码、输入法回车 |
| `accessibility` | 4 | `accessibility`(纪律) `accessible-error-announcement` `accessible-generated-content` `respect-os-text-scale` | 可访问性/无障碍、错误播报、生成内容可访问、系统字号缩放 |
| `performance` | 26 | `performance`(纪律) `identify-inp-causes` `break-up-long-tasks` `optimize-image-priority` `optimize-preload-priority` `optimize-script-priority` `defer-rendering-heavy-content` `lazy-load-video-and-audio` `schedule-tasks-by-priority` `deprioritize-background-fetches` `improve-next-page-load-performance` | 性能、INP 定位、长任务拆分、图片/预加载/脚本优先级、延迟渲染、音视频懒加载、任务调度、后台请求降级、下一页预取 |
| `security` | 17 | `security`(纪律) `sanitize-untrusted-html` `trusted-types` `secure-external-subresources` `validate-origins` `passkeys` `passkey-authentication` `quick-sign-ins` `client-side-encryption` `digital-signatures` `verify-email-ownership` | 安全、HTML 净化/XSS、可信类型、SRI、来源校验、通行密钥、快速登录、客户端加密、数字签名、邮箱验证 |
| `visual-design` | 22 | `color`(纪律) `typography`(纪律) `visual-effects`(纪律) `dark-mode` `contrast-color` `complex-shapes` `poster typography`(equal-width-text-lines) `soft-edge-content-fade` `visually-texture-content` `browser-ui-theming` | 颜色/对比度、排版、视觉效果、暗色模式、对比色、复杂形状、等宽标题、边缘渐隐、纹理、浏览器 UI 主题 |
| `user-experience` | 3 | `content-first-noise-reduction` `form-factor-adaptation` `natural-interactions` | 内容优先、形态/触控适配、自然交互反馈 |
| `built-in-ai` | 5 | `prompt-api` `language-model` `translator` `summarizer` `language-detection` | 浏览器内置 AI、本地模型、翻译、摘要、语言检测 |
| `pwa` | 2 | `install-web-app` `migrate-web-app-origin` | 安装应用、PWA、迁移域名 |
| `webmcp` | 3 | `webmcp` `agentic-forms` `agentic-javascript-tools` | WebMCP、表单/JS 暴露给 AI Agent |
| `js` | 5 | `calculate-event-differentials` `capture-location-agnostic-data` `coordinate-global-events` `sort-high-precision-timestamps` `support-global-calendar-systems` | 事件时间差、位置无关数据、全局事件、高精度时间戳、多历法 |
| `html` | 8 | `html`(纪律) `custom-elements` `web-components` `shadow-dom` `styling-web-components` `form-associated-custom-elements` `accessible-web-components` | HTML 语义、自定义元素、Web 组件、Shadow DOM、组件样式、表单关联组件、组件可访问性 |
| `privacy` | 1 | `privacy` | 隐私 |
| `wasm` | 1 | `cpp-on-the-web` | WebAssembly、C++/Emscripten |

## 2. 纪律型指南（12 篇，命中主题时必须叠加阅读）

| id | 何时叠加 |
| :--- | :--- |
| `css` | 任何样式架构/去重/层叠/作用域决策 |
| `html` | 任何语义结构、表单元素、资源加载决策 |
| `forms` | 任何表单/输入/校验/自动填充/提交 |
| `accessibility` | 任何交互组件、自定义控件、错误提示、键盘/焦点 |
| `performance` | 任何涉及加载、渲染、交互响应、动画、埋点 |
| `security` | 任何处理用户内容、外部资源、凭证、跨域 |
| `privacy` | 任何采集/存储/上报用户数据 |
| `motion` | 任何动画/过渡/滚动动效 |
| `color` | 任何配色/对比度/明暗模式/主题 |
| `typography` | 任何字号/行高/换行/字体加载 |
| `visual-effects` | 任何渐变/阴影/混合/图案/纹理 |
| `webmcp` | 任何把页面能力暴露给 AI Agent 的改造 |

## 3. 常见任务 → 检索配方

> 每条给出：一次 `search` 查询（英文/中文二选一）+ 预期 id。复合任务拆成多条。

| 任务 | `search` 查询 | 预期 id（读这些） |
| :--- | :--- | :--- |
| 确认/删除确认弹窗 | `confirmation dialog` / `删除前确认 对话框` | `dialog` + `light-dismiss-a-dialog`（若非阻塞）+ `prevent-page-scroll-under-modal-dialog` |
| 点击外部关闭 / Esc 关闭 | `light dismiss dialog` / `点击外部关闭` | `light-dismiss-a-dialog`、`platform-controls-dismiss-dialog` |
| 弹窗打开/关闭动画 | `animate dialog top layer` / `弹层动画` | `animate-to-from-top-layer`、`animate-element-entry-exit` |
| 非阻塞面板（find bar、检查器） | `popover panel dialog` | `dialog`（Rule 2：`<dialog popover>`）、`persistent-top-layer-ui` |
| 工具提示 / 气泡定位 | `tooltip positioning` / `提示框定位` | `position-aware-tooltips`、`interest-triggered-tooltips`、`viewport-aware-dropdowns` |
| 下拉菜单 | `dropdown menu` / `下拉菜单` | `menu`、`viewport-aware-dropdowns` |
| 抽屉/侧滑导航 | `navigation drawer` / `抽屉导航` | `navigation-drawer` |
| 标签页 | `tabs` / `标签页` | `tabs`、`anchor-positioning-tab-underline` |
| 轮播 | `carousel` / `轮播` | `carousel`、`carousel-snap-highlights`、`carousel-slide-effects` |
| 通知/轻提示 | `toast notification` / `通知` | `persistent-toast-notifications` |
| 进度指示 | `progress bar` / `进度条` | `progress`、`progress-ring`、`spinner` |
| 表格 | `responsive table` / `响应式表格` | `responsive-table`（+ `sortable-table`、`dynamic-sort`） |
| 暗色模式 | `dark mode` / `暗色模式` | `dark-mode`、`dark-mode-toggle`、`color`（+ `component-specific-light-dark-theme`） |
| 滚动条样式 | `customize scrollbar` / `滚动条样式` | `customize-scrollbar-color-and-thickness`、`adapt-scrollbar-to-contrast-preferences` |
| 容器查询/组件级响应式 | `container query` / `容器查询` | `size-aware-styling`、`responsive-design` |
| 页面/路由过渡 | `view transition pages` / `页面切换` | `same-document-transitions`、`cross-document-transitions`、`faster-spa-view-transitions` |
| 滚动动效（进场/视差/进度） | `scroll entry exit` / `滚动动画` | `scroll-entry-exit-effects`、`parallax-scroll-effects`、`scroll-progress-indicator`、`motion` |
| 列表增删/重排动画 | `sibling animation list` | `dynamic-sibling-animations`、`dynamic-sort`、`animate-to-intrinsic-sizes` |
| 高度自适应展开动画 | `animate to auto height` / `高度自适应动画` | `animate-to-intrinsic-sizes` |
| 拖拽排序 | `drag and drop sortable` / `拖拽排序` | `drag-and-drop`、`drag`、`sortable-table` |
| 滑动删除/侧滑操作 | `swipe to remove` / `滑动删除` | `swipe-to-remove`、`swipe-to-reveal` |
| 表单校验时机 | `validate input after interaction` / `表单校验` | `validate-input-after-interaction`、`accessible-error-announcement`、`required-field-feedback` |
| 自动填充 | `autofill address` / `表单自动填充` | `autofill-address-form`、`autofill-payment-form`、`autofill-highlight-inputs` |
| 输入法回车提交 | `ime enter submit` / `输入法回车` | `ime-safe-enter-submit` |
| 自定义选择器 | `customizable select` / `自定义选择器` | `custom-select-picker-layouts`、`branded-select-styling`、`select-menu-interaction` |
| 开关/滑块 | `switch` / `开关`、`slider` | `switch`、`slider` |
| 图片加载慢/LCP | `image priority` / `图片优先级` | `optimize-image-priority`、`deliver-optimized-decorative-images`、`performance` |
| 交互卡顿/INP | `identify INP causes` / `交互延迟` | `identify-inp-causes`、`break-up-long-tasks`、`schedule-tasks-by-priority` |
| 长列表/重内容渲染 | `defer rendering heavy content` | `defer-rendering-heavy-content`、`break-up-long-tasks` |
| 预加载/预取下一页 | `preload priority`、`next page load` | `optimize-preload-priority`、`improve-next-page-load-performance` |
| 用户 HTML 注入/XSS | `sanitize untrusted HTML` / `HTML 净化` | `sanitize-untrusted-html`、`trusted-types`、`security` |
| 外部脚本安全 | `external subresource integrity` | `secure-external-subresources` |
| Passkey 登录/注册 | `passkey authentication` / `通行密钥` | `passkeys`、`passkey-authentication`、`passkey-registration` |
| 日期/时区/多历法 | `date timezone calendar` / `日期时区` | `support-global-calendar-systems`、`capture-location-agnostic-data`、`calculate-event-differentials` |
| 浏览器内置 AI | `prompt api` / `浏览器内置 AI` | `prompt-api`、`language-model`、`summarizer`、`translator` |
| Web 组件/样式隔离 | `web component shadow dom` / `样式隔离` | `web-components`、`shadow-dom`、`styling-web-components`、`html` |
| 图标/单行省略/长文本 | `single line overflow icon` | `single-line-overflow`、`icons`、`typography` |
| 粘性/收缩头部 | `sticky header scroll` / `吸顶头部` | `state-aware-sticky-headers`、`shrinking-header-on-scroll` |
| 键盘/焦点/可访问性 | `keyboard focus accessibility` / `键盘导航` | `accessibility`、`natural-interactions`、`tab-management`(扩展) |
| 扩展到 AI Agent 工具 | `webmcp agentic tools` / `暴露给 AI` | `webmcp`、`agentic-forms`、`agentic-javascript-tools` |

## 4. 检索工具（离线 · 0 网络 · 支持中文）

```sh
# 从仓库根执行（技能目录被宿主报告时用 <base>/scripts/mwg.mjs）
# 推荐：一次命中并打印最佳指南全文（1 个进程，快 ~2×、路由开销少 ~86%）
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "<2-5 词意图>"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "暗色模式 滚动条" --two
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "<2-5 词意图>"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "暗色模式 滚动条" --json --limit 8
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs retrieve "dialog,light-dismiss-a-dialog"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs map ui-behaviors      # 浏览整类
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs cats | stats | check
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs features "content-visibility"
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs refs extensions        # Chrome 扩展参考
```

检索机制：标题/ id / 描述 / 小标题 / 正文加权 + id 全词覆盖加成 + 英文形态变体（validation↔validate）+ 中文 2–6 字子串 + `zh-glossary.json` 中文→英文扩展 + 每篇策划的中英 alias。输出只含 id/分类/描述/路径，正文用 `retrieve` 按需取，省 token。

**查询规范**

1. 2–5 个词，`动词/动作 + 具体 UI 或平台名词`。
2. 去掉框架名（React/Vue/Tailwind）、页面名、组件文件名、业务名词。
3. 用户没点名 UI 原语时，翻译成隐含原语（“先确认一下” → `confirmation dialog`；“选个日期” → `date picker`）。
4. 一次只查一个能力；复合需求拆开查。
5. 结果弱/为空：换同义词再查一次（`drawer`↔`sidebar`、`toast`↔`notification`、`弹窗`↔`对话框`），再用 `map`/`list` 浏览；确实无覆盖就明说并继续，不要硬凑。

## 5. 覆盖边界（不要在这些地方检索/编造）

- **覆盖**：客户端 Web 平台——HTML/CSS/语义、布局、组件、行为与动效、表单、可访问性、性能/CWV、安全、Passkeys、PWA、内置 AI、WASM、WebMCP、Chrome 扩展页面/API/上架。
- **不覆盖**：后端（SQL/ORM/路由）、数据库、构建工具、CI/CD、Git/Docker、测试框架、第三方库用法。
- **Chrome 扩展**：单独加载 `chrome-extensions` skill；参考分组见第 7 节；`mwg.mjs retrieve "side-panel"` 可取正文。

## 6. 验收清单（写完后逐条过）

先读指南里的 **DO / DON'T** 与强制片段，再跑真实浏览器验收（`frontend-verification` skill，本机已实测可用）：

```powershell
$V = ".agents\skills\frontend-verification\scripts\verify.mjs"
$url = ([System.Uri]("$env:TEMP\my-page\index.html")).AbsoluteUri   # 或 http://localhost:5173/
node $V run --url $url --checks .\checks.json --quick                    # 迭代期快跑（1 视口 1 图，约快 75%）
node $V run --url $url --checks .\checks.json --out .\.verify\run-1      # 交付前全量（多视口×明暗 + 控制台/a11y/溢出/性能/焦点 + 断言）
node $V shot --url $url --out .\shot-dark.png --viewport 1440x900 --theme dark
node $V a11y --url $url --out .\.a11y
node $V perf --url $url
node $V compare --a .\before.png --b .\after.png --out .\diff.png
```

> `--quick` 的 `report.mode='quick'` 与 `skipped` 列表会标明覆盖边界：**quick PASS 不等于完整验收**，交付前必须再跑 full。

退出码 `0` = PASS，`1` = 有阻断项，`2` = 工具/参数错误；报告在 `<out>/report.json` 与 `report.md`（截图、console 原文、计算样式实测值、性能数值都是证据）。
无浏览器时按 skill 的 L3 降级口径报告「未验证」，不得写 PASS。

逐条自查：

- [ ] 每个应用的指南 id，其 DO 都已做到、DON'T 都没有违反（特别是“不要手写 role/aria、不要手写 focus trap、不要 `overflow:hidden` 锁滚动”这类）。
- [ ] 非 Baseline 特性都有指南要求的 fallback；没有无谓 polyfill。
- [ ] 可访问性：可键盘操作、焦点可见且顺序合理、有可访问名称、错误被播报（`aria-invalid` + `:user-invalid` 同步）。
- [ ] 响应式：360 / 768 / 1440 视口无横向溢出、触控目标 ≥24–44px、无内容碰撞。
- [ ] 明暗主题：`prefers-color-scheme`、`prefers-contrast`、`prefers-reduced-motion` 下表现正确。
- [ ] 运行时：控制台无 error、无请求失败、无 hydration mismatch（框架场景）。
- [ ] 性能：首屏图片有 `fetchpriority`、非首屏资源 lazy、交互无长任务/明显 INP 劣化、无 CLS 抖动。
- [ ] 安全：用户内容走 Sanitizer/Trusted Types，外部资源有 SRI，Origin 校验到位。
- [ ] 证据：截图（含明暗/多视口）、控制台、计算样式、性能数值；**没有证据不算完成**。
- [ ] 自动检查覆盖不到的部分（对比度具体值、reduced-motion、粘性遮挡、懒加载占位）按 `references/checklists.md` 人工补测。

## 7. Chrome 扩展参考（22 篇）

| 分组 | id | 用于 |
| :--- | :--- | :--- |
| `extensions` | `api-calling` `auth-identity` `content-scripts` `context-menus` `csp-sandbox` `declarative-net-request` `devtools` `icons` `media-capture` `message-passing` `omnibox` `permissions` `popup-ui` `prompt-api` `service-worker` `side-panel` `storage` `tab-management` `user-scripts` | Manifest V3 各能力面；`service-worker`（生命周期/alarms）、`csp-sandbox`（eval 禁令）、`side-panel`（必须提供打开入口）、`message-passing`（offscreen 桥接）是最常踩坑的 4 篇 |
| `webstore` | `chromewebstore-template` `privacy-policy` `review-checklist` `store-listing` | 上架：`CHROMEWEBSTORE.md` 模板 → 隐私政策 → 审核清单 → 文案与驳回原因 |

## 8. 维护

- 拉取上游新版本后：`node .agents/skills/modern-web-guidance-router/scripts/build-index.mjs`（重建 `index.json` 与 `intent-routes.md`），再 `mwg.mjs check`。
- 人工维护：`references/aliases.json`（按 id 的中英触发词）、`references/zh-glossary.json`（中文→英文词表）。新增指南若未命中，先补 alias/glossary 再重建。
- `stats` 报告 STALE 表示索引落后于仓库文件。
- 上游技能版本变化时，`npx` 回退命令需带上 `stats` 输出的 `skill-version`。
