# Intent routes — 意图 → 指南 id（自动生成）

<!-- 由 scripts/build-index.mjs 生成，请勿手改。人工维护的触发词在 references/aliases.json（按 id）与 references/zh-glossary.json（中文→英文词表）。 -->

索引时间：2026-11-16T17:51:29.262Z · 指南 209 篇 · 分类 17 个 · 中文词表 224 条

> 检索：`node scripts/mwg.mjs search "<中文或英文意图>"` 会同时使用下列触发词、标题、描述与正文。

## 可访问性（accessibility，4 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `accessibility` | Accessibility Coding Guidelines | 可访问性、无障碍、a11y、焦点可见、键盘焦点、焦点管理 | This guide provides actionable DOs and DON'Ts for AI coding agents to ensure web applications are accessible to all users, including those using as… |
| `accessible-error-announcement` | Accessible Error Announcement | 错误播报、表单错误无障碍、表单提交报错、aria-invalid | Synchronize programmatic accessibility states (like aria-invalid) with the visual :user-invalid state to ensure screen reader users receive error f… |
| `accessible-generated-content` | Accessible generated content | 生成内容可访问、伪元素替代文本 | Use CSS generated content (`::before`/`::after`) in ways that stay accessible, including alternative text for decorative content. |
| `respect-os-text-scale` | Respect Operating System Text Scale | 系统字号缩放、文字大小偏好、rem 缩放 | Respect the operating system's text scale preference for a page so font sizes, layout, and rem-based measurements follow the user's accessibility s… |

## 浏览器内置 AI（built-in-ai，5 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `language-detection` | Language Detection | 语言检测、识别语言 | Detect the language of user-generated content or already present site content. |
| `language-model` | Language Model | 本地语言模型、LanguageModel、客户端模型 | Run on-device natural language inference in the browser using the Prompt API, with streaming output, structured JSON responses, and multi-turn sess… |
| `prompt-api` | Language Model | Prompt API、内置 AI 提示、浏览器内模型 | The Prompt API allows developers to run natural language processing tasks directly in the browser using **Gemini Nano**. This built-in AI approach … |
| `summarizer` | Summarizer | 摘要 API、文本摘要 | Summarize text content using the on-device Summarizer API. |
| `translator` | Translator | 翻译 API、浏览器翻译 | Translate text between languages using the on-device Translator API. |

## CSS 与布局（css，18 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `animate-to-intrinsic-sizes` | Animate to Intrinsic Sizes | 动画到内容尺寸、高度自适应动画、auto高度动画 | Smoothly animate interactive components (like accordions, menus, and expanding cards) to and from their natural dimensions. |
| `atrule-support-conditionals` | Conditionally Apply CSS Based on At-Rule Support | 特性查询、渐进增强条件、@supports 分支 | Conditionally apply certain CSS rules or declarations only if a certain at-rule is supported by the browser. |
| `calculate-with-intrinsic-sizes` | Calculate With Intrinsic Sizes | 内容尺寸计算、calc-size、尺寸参与计算 | Calculate the size of an element based on its intrinsic size, while ensuring it fits within given design constraints. |
| `child-state-based-styling` | Child State Based Styling | 父元素根据子状态变色、子状态驱动样式、:has 父选择、根据子元素状态改父元素、父元素样式 | Build a component that changes its styling based on the state of one of its child elements. For example, a component that renders in light or dark … |
| `content-based-styling` | Content Based Styling | 内容感知样式、根据内容数量样式 | Build a component that changes its layout based on whether it contains specific child elements (or not). For example, if the component contains an … |
| `css-layout` | CSS Layouts and Responsive Design | 布局方案、页面布局、现代布局 | Modern CSS layouts such as flexbox, grid, subgrid, container queries, anchor positioning, and intrinsic sizing. Use this skill when architecting re… |
| `css` | CSS: Modern Architecture | CSS 架构、样式规范、CSS 最佳实践、样式组织 | Action-oriented guidelines for modern CSS architecture, including the cascade, selectors, scoping, nesting, and design tokens. Use this guide when … |
| `design-token-reactivity` | Design Token Reactivity | 设计令牌、CSS 变量响应、主题变量 | Define higher-order design tokens, like density modes (compact, comfortable, spacious) or themes and have descendant components react to changes di… |
| `dynamic-sibling-styling` | Styling siblings based on count and index | 兄弟元素样式、相邻元素样式、根据兄弟数量 | Create dynamic visual spectrums or layout arrangements that automatically adapt to the number of elements in a group. |
| `fluid-scaling` | Fluid Scaling | 流体缩放、自适应字号、clamp 缩放 | Scale items like font size, spacing, and media sizes smoothly based on the parent container's size rather than using fixed breakpoints |
| `individual-transform-properties` | Individual Transform Properties | 独立变换属性、translate rotate scale 分开写 | Animate or override individual CSS transform properties (e.g. translate, rotate, scale) independently of other transform properties on a single ele… |
| `overflow-clipping-control` | Overflow Clipping Control | 裁剪控制、overflow-clip-margin、内容溢出裁剪 | Adjust the visible clipping boundary of an element to align with the content edge, padding edge, or border edge—or a specified offset from any of t… |
| `reduce-style-repetition` | Reduce Style Repetition with CSS Functions | 样式复用、减少重复样式、样式去重 | Reduce excessive style repetition by encapsulating complex or dynamic styling logic into reusable functions (such as a function that computes a gra… |
| `responsive-design` | Responsive design | 响应式设计、自适应布局、多端适配 | Build UI that adapts to container and viewport size, including container queries, dynamic viewport units, aspect ratios, and responsive typography. |
| `selector-atrule-combinations` | Selector & @-rule Combinations | 选择器组合、嵌套选择器技巧、at-rule 嵌套 | Target elements based on the intersection or union of selectors and conditional @-rules while minimizing repetition. |
| `size-aware-styling` | Size Aware Styling | 容器查询、按容器尺寸适配、组件响应式 | Build a component whose styles can be conditionally dependent on its own width or height, rather than the width or height of the viewport. For exam… |
| `style-parent-with-has` | Style a Form Group When a Field Is Invalid with :has() | 父选择器、根据子元素状态改父样式 | Style parent elements of a form field (e.g. labels or fieldsets) when the field is invalid. |
| `usage-aware-component-variations` | Semantic Component Adaptation | 用法感知变体、组件变体样式 | Build components that adapt visual logic based on semantic context using CSS container style queries. |

## 表单与输入（forms，19 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `animated-select-picker` | Animated Select Picker | 选择器动画、下拉选择动画 | Create a custom select component whose dropdown is animated. For example, the menu fades or slides into view, or the options animate upon selection. |
| `autofill-address-form` | Build an address form that follows best practice | 地址自动填充、收货地址表单 | Build an address form with correct autocomplete attributes and autofill support. |
| `autofill-highlight-inputs` | Customize the styling of autofilled form fields | 自动填充高亮、:autofill 样式、黄底输入框 | Customize the styling of form fields that have been autofilled and not edited by the user |
| `autofill-payment-form` | Build a payment form that follows best practice | 支付表单自动填充、信用卡表单 | Build a payment form that collects card details with correct autocomplete values and autofill support. |
| `autofill-sign-in-form` | Build a sign-in form that follows best practice | 登录表单自动填充、密码管理器、密码自动填充、密码管理器自动填充 | Build a sign-in form with correct autocomplete values and autofill support. |
| `autofill-sign-up-form` | Build a sign-up form that follows best practice | 注册表单自动填充 | Build a sign-up form with correct autocomplete values and autofill support. |
| `brand-consistent-forms` | Brand-Consistent Forms | 品牌化表单、表单样式统一 | Match checkboxes, radio buttons, range sliders, and progress bars to your site's color palette without replacing them with custom components. |
| `branded-select-styling` | Branded Select Styling | 选择框样式、select 美化 | Create custom select elements whose button, picker, arrow icon, and checkmark all seamlessly match your brand or design system's typography, colors… |
| `custom-select-picker-layouts` | Custom Select Picker Layouts | 自定义选择器布局、可定制 select | Create custom select pickers whose options are positioned in unique or interesting ways, rather than the traditional stacked list of options. |
| `form-fields-automatically-fit-contents` | Form Fields Automatically Fit Contents | 输入框自适应宽度、字段自动撑开 | Allow form fields to grow and shrink to fit the user input, e.g. as the user types or selects a different option. Apply maximum and minimum size li… |
| `forms` | Forms | 表单规范、表单最佳实践、表单架构 | .field { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; margin-block-end: 1.5rem; } |
| `ime-safe-enter-submit` | IME-safe enter-to-submit | 输入法回车提交、中文输入法回车、IME 组合输入 | Implement Enter-to-submit in textareas and single-line inputs (chat, search, inline rename) safely for IME (Input Method Editor) users to prevent s… |
| `required-field-feedback` | Required Field Feedback | 必填反馈、必填提示、required 样式 | Provide error message for required form fields that were skipped or left empty *only* after user interaction, to avoid preemptive errors and ensure… |
| `rich-media-picker` | Rich Media Picker (Customizable Select) | 富媒体选择、图片选择器、媒体上传选择 | Create a custom select component whose options can contain complex HTML formatting (e.g. images, icons, and other rich formatting) rather than just… |
| `select-menu-interaction` | Select Menu Interaction | 选择菜单交互、select 菜单键盘 | Validate that a non-default option has been chosen in a select menu only after the user has interacted with the control. |
| `slider` | Brand-Consistent Range Slider | 滑块、范围滑块、滑动输入 | Style a native range slider with custom track, thumb, fill, and focus states while preserving native functionality and accessibility. |
| `sms-otp-form` | SMS OTP form verification | 短信验证码、OTP 输入、验证码表单 | Verify user phone numbers and one-time passcodes delivered over SMS with automatic code extraction and accessible form input. |
| `switch` | Build Accessible Switch Controls | 开关、切换开关、switch 控件 | Build an accessible switch with the native HTML switch attribute, falling back to a styled checkbox when not supported. |
| `validate-input-after-interaction` | Validate Input After Interaction | 交互后校验、失焦校验、user-invalid | Show form field validation feedback (e.g. password complexity or email format requirements) only after the user has finished their initial interact… |

## HTML 与 DOM（html，8 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `accessible-web-components` | Accessible Web Components | 可访问 Web 组件、组件可访问性 | Make custom elements accessible by default, setting roles and ARIA state via the ElementInternals ARIA mixin, managing focus with delegatesFocus, a… |
| `custom-elements` | Custom Elements | 自定义元素、custom element、Web 组件 | Define, register, and manage the lifecycle of autonomous custom elements, covering constructor rules, lifecycle callbacks, upgrade timing, attribut… |
| `form-associated-custom-elements` | Form-Associated Custom Elements | 表单关联自定义元素、自定义表单控件 | Make a custom control participate natively in forms with formAssociated and ElementInternals, submitting its own value, integrating with constraint… |
| `html` | HTML | HTML 规范、HTML 语义、HTML 最佳实践 | Platform - Policies and legal information |
| `prerendering-custom-elements` | Pre-rendering custom elements | 预渲染自定义元素、组件预渲染 | Server-render a custom element, then hydrate it in place without re-rendering or a flash of unstyled content. |
| `shadow-dom` | Shadow DOM, Templates & Slots | Shadow DOM、影子 DOM、样式隔离 | Encapsulate a component's DOM and styles with Shadow DOM, construct the tree efficiently with HTML templates, and project consumer content with slots. |
| `styling-web-components` | Styling Web Components | Web 组件样式、组件样式隔离 | Style across the shadow boundary with :host selectors, inherited and custom properties for theming, ::slotted and ::part, and cascade layers and co… |
| `web-components` | Web Components Orientation | Web 组件、组件封装、原生组件 | Orientation and cross-cutting principles for authoring and using Web Components, covering Custom Elements, Shadow DOM, templates and slots, Declara… |

## JavaScript 与日期时间（js，5 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `calculate-event-differentials` | Calculating Event Differentials and Formatting Durations with Temporal | 事件时间差、帧间差值 | Calculate elapsed or remaining time between dates and times, balance duration units, and format human-readable localized durations using Temporal.D… |
| `capture-location-agnostic-data` | Capturing Location-Agnostic Data and Partial Dates with Temporal | — | Model location-agnostic calendar dates, wall-clock times, partial dates (recurring birthdays, credit card expirations), and recurring monthly inter… |
| `coordinate-global-events` | Coordinating Global Events with Temporal | — | Schedule future meetings or events by explicitly binding them to a geographical IANA time zone so that event times remain accurate regardless of Da… |
| `sort-high-precision-timestamps` | Sorting High-Precision Timestamps with Temporal.Instant | 高精度时间戳排序、时间精度 | Parse, sort, and measure intervals between sub-millisecond or nanosecond ISO 8601 timestamps without Date truncation collisions using Temporal.Inst… |
| `support-global-calendar-systems` | Supporting Global Calendar Systems with Temporal | 多历法支持、非公历日期 | Display and calculate dates in non-Gregorian calendar systems (e.g., Islamic, Hebrew, or Chinese) accurately for international users. |

## 性能（performance，26 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `batch-analytics-events` | Debounce and batch multiple analytics events | 埋点批量上报、分析事件批处理 | Debounce and batch multiple analytics, telemetry, and Core Web Vitals events together in a single beacon to minimize network contention and reduce … |
| `break-up-long-tasks` | Break Up Long Tasks | 长任务拆分、主线程卡顿、scheduler.yield | Break up heavy synchronous processing (complex computations and/or long loops) or DOM updates to improve Interaction to Next Paint (INP) responsive… |
| `calculate-total-foreground-time` | Calculate total foreground time | — | Calculate the total time a user actually spent viewing a page, excluding periods when the tab was in the background. |
| `conditional-async-dependencies` | Conditional Async Dependencies | — | Conditionally load or initialize async dependencies (such as importing polyfills for missing web features) without requiring complex orchestration … |
| `defer-rendering-heavy-content` | Defer rendering heavy content | 延迟渲染重内容、content-visibility | Reduce rendering times in content-heavy web pages (e.g. pages with long feeds, lots of articles, or complex dashboards), by deferring rendering for… |
| `defer-work-until-scroll-ends` | Defer Work Until Scroll Ends | — | Defer expensive operations like DOM updates, data fetching, analytics tracking, or layout recalculation until after scrolling completes to maintain… |
| `deliver-optimized-decorative-images` | Deliver Optimized Decorative Images | 装饰图优化、背景图优化 | Deliver optimized decorative images (such as backgrounds, UI icons, or complex masks) by simultaneously providing next-generation image formats (li… |
| `deprioritize-background-fetches` | Deprioritize background fetches | 后台请求降级、低优先级请求 | Deprioritize background data fetches made with the Fetch API to prevent network contention with user-initiated requests. |
| `detect-initial-visibility-state` | Detect Initial Visibility State | 首屏可见性检测、初始可见状态 | Reliably determine whether a page was initially loaded in the background, even in cases where the script is loaded asynchronously after the user fo… |
| `efficient-background-processing` | Efficient Background Processing | — | Conserve system resources and battery life by pausing background JavaScript execution (such as `&lt;canvas&gt;` animations, WebGL rendering, or hig… |
| `faster-spa-view-transitions` | Faster SPA View Transitions via State Caching | SPA 过渡优化、视图过渡性能 | Enable faster transitions back to previously visited views in a Single-Page Application (SPA) by preserving their structural DOM state instead of d… |
| `flicker-free-client-side-ab-testing` | Flicker-Free Client-Side A/B Testing | — | Deliver and render A/B tests, multi-variate tests, or other experiments using client-side JavaScript to alter or inject HTML, CSS, and JavaScript w… |
| `full-session-analytics` | Reliably measure full-session analytics and telemetry | 会话埋点、全量行为分析 | Reliably track analytics, Core Web Vitals, errors, and telemetry data across the user's entire page visit, and defer sending of the data until the … |
| `identify-heavy-scripts` | Identify heavy-running JavaScript | 重脚本识别、长动画帧、脚本性能 | Identify the scripts most responsible for long animation frames |
| `identify-inp-causes` | Identify causes of poor INP | INP 定位、交互延迟、响应慢 | Identify slow-running JavaScript and other causes of poor Interaction to Next Paint (INP) responsiveness. |
| `improve-next-page-load-performance` | Improve next page load performance | 下一页加载优化、预取 | Improve page load performance by prefetching or prerendering pages that the user is likely to visit next. |
| `interaction-paint-timing` | Measure interaction and soft-navigation paint timing | 交互绘制时间、交互性能指标 | Measure the time it takes for user interactions and client-side navigations to render new contentful updates on screen. |
| `interactions-in-complex-layouts` | Optimizing Interactions in Complex Layouts | 复杂布局交互性能、布局抖动 | Make interactions snappier and more responsive (reducing Interaction to Next Paint (INP) scores) by avoiding layout re-calculations in complex layo… |
| `lazy-load-video-and-audio` | Lazy load video and audio | 音视频懒加载、懒加载视频 | Defer downloading offscreen video and audio assets, including video poster images and preloaded media data, until the media player approaches the v… |
| `optimize-image-priority` | Optimize image priority | 图片优先级、首图优化、fetchpriority | Optimize the loading priority of Largest Contentful Paint (LCP) candidate images and deprioritize non-critical images to reduce critical resource l… |
| `optimize-preload-priority` | Optimize preload priority | 预加载优先级、preload 优化 | Optimize the relative priority of preloaded content to reduce critical resource load delays. |
| `optimize-script-priority` | Optimize script priority | 脚本优先级、脚本加载优化 | Optimize the loading priority of scripts by boosting critical asynchronous scripts and deprioritizing non-essential or late-body scripts to improve… |
| `out-of-order-html-streaming` | Out-of-Order (OOO) HTML Streaming | HTML 流式渲染、乱序流式输出 | Declaratively update a page with content streamed later into the same HTML document or via imperative JavaScript APIs. |
| `performance` | Performance | 性能优化、性能最佳实践、Core Web Vitals | The Critical Rendering Path dictates how quickly the browser converts HTML, CSS, and JavaScript into painted pixels. |
| `resolution-optimized-pseudo-elements` | Resolution Optimized Pseudo Elements | — | Use resolution-optimized images in CSS pseudo-elements (such as `::before` and `::after`) to reduce the number of DOM nodes. |
| `schedule-tasks-by-priority` | Schedule Tasks By Priority | 任务优先级调度、scheduler.postTask | Schedule tasks with different priorities to ensure critical work runs first while background work is deferred. |

## 隐私（privacy，1 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `privacy` | Web Privacy Guidelines for Developers | 隐私、用户隐私、隐私保护 | Action-oriented guidelines for web developers to implement privacy by design, data minimization, third-party audits, and secure data handling. Use … |

## PWA 安装（pwa，2 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `install-web-app` | Installing web applications | 安装应用、添加到主屏、PWA 安装、离线安装应用、安装到桌面 | Install web applications from a page using browser-controlled consent UI. |
| `migrate-web-app-origin` | Migrating the Origin of an Installed Web App | — | Transfer an installed web app to a new origin while preserving user configuration and OS-level shortcuts. |

## 安全与凭证（security，17 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `client-side-encryption` | Encrypt data client-side with WebCrypto | 客户端加密、端到端加密 | Establish shared secrets using public-key encapsulation or key agreement—including hybrid and post-quantum protection—and encrypt sensitive data in… |
| `digital-signatures` | Sign and verify data with WebCrypto | 数字签名、数据签名 | Sign and verify messages, tokens, or artifacts in the browser using classical or quantum-resistant (post-quantum) asymmetric keys to ensure data in… |
| `local-network-access` | Local Network Access | 本地网络访问、局域网请求 | Access resources on a user's local network or loopback interface from a public web application. |
| `passkey-authentication` | Passkey Authentication | Passkey 登录、无密码认证 | Authenticate a returning user with a passkey for primary sign-in. |
| `passkey-conditional-create` | Passkey Conditional Create (Post-Login Promotion) | Passkey 条件创建 | Silently register a passkey for an existing user after a successful password login. |
| `passkey-management` | Passkey Management | Passkey 管理、管理通行密钥 | Let users view and manage the passkeys registered to their account. |
| `passkey-reauthentication` | Passkey Reauthentication | Passkey 二次验证、重新认证 | Verify a signed-in user's identity using their existing passkeys before a sensitive action. |
| `passkey-registration` | Passkey Registration | Passkey 注册、创建通行密钥 | Register a passkey for an existing user account. |
| `passkeys` | Passkeys Orientation | 通行密钥、passkey、无密码登录 | Comprehensive orientation and cross-cutting principles for implementing WebAuthn and Passkeys in web applications. Use this guide when handling pas… |
| `quick-sign-ins` | Quick sign-ins with immediate UI mode | 快速登录、一键登录 | Authenticate returning users in place with their saved passkeys or passwords before navigating to a sign-in page or interrupting their workflow. |
| `restrict-outbound-connections` | Restrict outbound network connections with Connection Allowlists | 限制外联、出站连接限制 | Restrict a page or worker to communicating only with an explicit allowlist of network endpoints to prevent unauthorized third-party requests and cl… |
| `sanitize-untrusted-html` | Sanitizing Untrusted HTML | HTML 净化、XSS 防护、用户内容渲染、注入防护 | Safely parse and display untrusted HTML content from user input by removing unsafe elements and attributes. |
| `secure-external-subresources` | Secure external subresources with Subresource Integrity, CORS, and Referrer Policy | 外部资源安全、SRI 子资源完整性 | Verify the cryptographic integrity of external scripts, stylesheets, fonts, and images loaded from third-party origins, and control whether those r… |
| `security` | Web Security | 安全、Web 安全、安全最佳实践 | Guidelines for implementing preventative security measures on the web safely and incrementally. |
| `trusted-types` | Prevent DOM-based XSS attacks with Trusted Types | 可信类型、Trusted Types、DOM 注入防护 | Prevent DOM-based XSS attacks by defining a Trusted Types policy to sanitize untrusted HTML, using the policy when writing to DOM sinks like innerH… |
| `validate-origins` | Compare and validate web origins and sites | 来源校验、Origin 校验、跨域校验 | Compare and validate web origins and sites safely across cross-document messages and URLs without error-prone string parsing. |
| `verify-email-ownership` | Verify email address ownership | 邮箱验证、邮箱所有权 | Verify that a user owns an email address during account creation, sign-in, or recovery without sending a one-time passcode or magic link email. |

## UI 微件（ui-atoms，13 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `carousel-slide-effects` | Build Carousel Slide Effects | 轮播动效、轮播切换效果 | Create a carousel of slides with images or other visual elements, where each slide animates as they enter/center/exit their scroller. For example, … |
| `component-specific-light-dark-theme` | Component-specific light/dark themes | 组件级明暗主题、局部暗色 | Force certain elements to be in light mode or dark mode (e.g. code blocks, media players, etc) independently of the page's color-scheme. |
| `icons` | Using and managing icons | 图标、图标按钮、SVG 图标 | Display and manage icons that can be set and parameterized from CSS, are fast to load, crisp at any resolution and are properly exposed to (or hidd… |
| `position-aware-tooltips` | Position Aware Tooltips | 气泡提示、提示定位、浮层定位 | Build tooltips and popovers with directional arrows (or other visual styling) that automatically point the correct way when the element flips to a … |
| `pull-to-reveal` | Pull to Reveal | 下拉显现、下拉刷新、下拉展开 | Build a pull-to-reveal feature that would enable the user to pull down on the screen to reveal more content, like a search bar. |
| `responsive-table` | Responsive tables | 响应式表格、移动端表格、表格适配 | Build a data table that presents tabular data with proper header semantics, and remains readable and navigable on small screens and with assistive … |
| `scroll-position-aware-elements` | Scroll Position Aware Elements | 滚动位置感知、滚动联动 | Build floating buttons or widgets (back-to-top, scroll-to-bottom, chat launchers, etc.) that appear and disappear based on whether the user has scr… |
| `scroll-progress-indicator` | Build a Scroll Progress Indicator | 阅读进度条、滚动进度 | Create a scroll progress bar, stepped progress tracker, or any visual affordance that communicates how far through a page or section the user has s… |
| `scrollability-affordance-hints` | Scrollability Affordance Hints | 可滚动提示、滚动方向提示、渐隐提示可滚动 | Build scroll shadows or fading edges that appear only when there's actually more content to scroll to in that direction. |
| `shrinking-header-on-scroll` | Shrinking header on scroll | 滚动收缩头部、滚动隐藏头部、大标题收缩 | Smoothly animate a fixed header or full-page cover on scroll to dynamically shrink, gain shadows, and transform its layout over a predefined scroll… |
| `single-line-overflow` | Single-line text overflow | 单行溢出、省略号、文本截断 | Show text that must stay on one line, such as a tab label, table cell, navigation item, or file name, in a space it may not fit, without breaking t… |
| `state-aware-sticky-headers` | State-Aware Sticky Headers | 粘性头部、吸顶头部、粘性导航、吸顶导航栏、吸顶 | Build sticky section headers or navbars that visually transform when they're actually "stuck" at the top, changing their color scheme or gaining a … |
| `viewport-aware-dropdowns` | Viewport-Aware Dropdowns | 下拉定位、视口边缘自适应、浮层翻转 | Position dropdowns, flyouts, or contextual action panels tethered to a trigger button so they automatically flip axes at viewport edges instead of … |

## UI 行为与动效（ui-behaviors，40 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `2d-panning` | Two-Dimensional Panning | 画布平移、拖拽平移、缩略图导航 | Allow users to freely pan or scroll two-dimensional surfaces—such as maps, zoomed images, infinite canvases, or large data grids—across both direct… |
| `anchor-positioning-tab-underline` | Anchor Positioning Tab Underline | 标签下划线滑动、锚点定位下划线 | Transition an element seamlessly between two target element positions. For example, moving a selected tab underline between the previously selected… |
| `animate-element-entry-exit` | Animate Element Entry and Exit | 进出场动画、入场动画、退场动画、显隐过渡 | Smoothly hide/show elements as they are added/removed from the DOM or as their display values are toggled. |
| `animate-to-from-top-layer` | Animate Elements To and From Top Layer | 弹层动画、顶层元素动画、对话框打开动画、弹窗动画、弹窗打开动画 | Animate elements such as dialogs, popovers, and tooltips as they're entering/exiting the top layer. |
| `carousel-snap-highlights` | Carousel Snap Highlights | 轮播吸附、滚动吸附高亮 | Visually highlight the currently snapped non-interactive item in scroll-snapping carousels, galleries, or full-page swipe experiences. For example,… |
| `consistent-cross-document-transitions` | Consistent Cross-Document Transitions | 跨页面过渡、多页应用过渡 | Ensure critical page state is loaded and stable before initiating a cross-document view transition. This means critical CSS styles are loaded and a… |
| `cross-document-transitions` | Cross-Document Transitions | 跨文档过渡、页面切换动画、MPA 过渡、页面切换、多页应用切换、页面跳转 | Create smooth, seamless transitions between full page navigations, such as cross-fades, custom reveal effects, or morphing of content from one page… |
| `custom-button-actions` | Custom Button Actions | 按钮命令、声明式按钮行为 | Declaratively connect a button to any element to trigger custom, application-specific actions using declarative button commands, invoker commands, … |
| `declarative-dialog-popover-control` | Declarative Dialog and Popover Control | 声明式弹层控制、按钮打开弹窗、commandfor | Toggle the visibility of a dialog or popover from a button without writing JavaScript. |
| `directional-navigation-transitions` | Directional Navigation Transitions | 方向导航过渡、前进后退动画 | Animate visual state changes to reflect the direction of a user's navigational flow, such as sliding new content in from the right when advancing f… |
| `drag-and-drop` | Rearrange Items with Drag and Drop | 拖放、拖拽排序、拖拽列表、拖拽交换 | Support dragging to rearrange the children of a container along one axis (horizontal or vertical) while preserving their state and accessible order. |
| `drag` | Build a Draggable Element | 拖拽、拖动元素、拖拽手势 | Support dragging to move a floating element around the page. |
| `dynamic-sibling-animations` | Creating a stagger animation | 兄弟元素动画、列表增删动画、交错动画 | Stagger animation or transition timing across sibling elements so each one starts after a computed delay based on its position in the sibling list. |
| `dynamic-sort` | Handling dynamic user-triggered changes to sort order | 动态排序动画、列表重排动画 | Best practices for handling dynamic user-triggered reordering of a container's children (e.g. list items, table rows, or a card grid), with optiona… |
| `group-element-transitions` | Smoothly rearrange cards, lists, and groups of elements on add, remove, or reorder | 群组过渡、共享元素过渡、列表到详情 | Smoothly rearrange and animate list items, cards, or grid elements into their new positions simultaneously when adding, removing, shuffling, or reo… |
| `highlight-text-ranges` | Highlight Text Ranges | 文本高亮、搜索命中高亮、自定义高亮 | Highlight arbitrary text ranges on a page such as search results, spelling errors, or collaborative editing cursors. |
| `interactive-content-reveal` | Interactive Content Reveal | 内容揭示、滚动揭示、逐段出现 | Create interactive reveal effects, such as a spotlight that follows the user's pointer to uncover details within an image or UI section. |
| `interest-triggered-action-previews` | Interest Triggered Action Previews | 悬停预览、悬停预加载、interestfor | Show a live preview of a button's effect when a user signals interest (e.g. hovering, focusing, or long-pressing) but before they commit to clicking. |
| `interest-triggered-tooltips` | Show a tooltip when hovering | 悬停提示、悬停显示提示 | Show a tooltip or supplemental information when a user hovers over, focuses on, or long-presses an interactive element, without requiring a click. |
| `light-dismiss-a-dialog` | Light-Dismiss a Dialog | 点击外部关闭、轻关闭、点击遮罩关闭 | Create a modal dialog that can be closed via light dismiss (i.e. clicking or tapping outside of the dialog) |
| `motion` | Motion | 动效、动画原则、运动 | Animate UI with CSS transitions, animations, scroll-driven animations, and view transitions while keeping motion on the compositor and respecting r… |
| `move-dom-element-without-losing-state` | Move DOM Element Without Losing State | 移动DOM保留状态、moveBefore、重排DOM | Move or reparent a DOM element without losing important element state, such as interactivity states (:focus/:active), `&lt;iframe&gt;` loading stat… |
| `parallax-scroll-effects` | Build a Parallax Effect on Scroll | 视差滚动、视差效果 | Create scroll-based effects (such as parallax) where foreground and background layers move at different rates, creating a sense of depth as the use… |
| `persistent-top-layer-ui` | Persistent Top Layer UI | 常驻顶层、顶层浮层、top layer 常驻 | Keep a modal dialog, fullscreen element, or native popover visibly open and functionally active when its underlying DOM node is moved or reparented… |
| `physics-based-easing` | Physics Based Easing | 物理缓动、弹簧动画、弹性缓动 | Create custom, physics-based animation and transition effects, like bounce and spring, that feel more natural and engaging than traditional easing … |
| `platform-controls-dismiss-dialog` | Platform Controls Dismiss Dialog | 平台控件关闭弹窗、关闭按钮处理 | Create a modal dialog that can be closed via standard platform-specific user actions, such as pressing the `Esc` key on desktop platforms, or a "ba… |
| `prevent-page-scroll-under-modal-dialog` | Prevent the Page Underneath a Modal Dialog from Scrolling | 模态滚动锁定、背景滚动禁用、滚动穿透 | Prevent the underlying page from scrolling while a modal dialog is open. |
| `same-document-transitions` | Same Document Transitions | 同文档过渡、SPA 过渡、单页切换动画、站内切换、单页应用切换 | Visually connect persisting elements across different page states or navigations in a Single Page Application (SPA) (e.g. expanding a product thumb… |
| `scoped-component-transitions` | Scoped Component Transitions | 局部过渡、组件内过渡 | Animate state changes inside a single component (a card, list, panel, or other subtree) while the rest of the page remains interactive, and other t… |
| `scroll-completion-effects` | Triggering Effects After Programmatic Scrolling Completes | 滚动完成效果、滚动结束回调 | Trigger visual effects, animations, or focus changes on a target element only after a smooth programmatic scroll to that element has finished. |
| `scroll-entry-exit-effects` | Add entry and exit effects to elements as they enter or exit the scrollport | 滚动进出场、滚动触发动画、滚动出现动画、滚动到元素出现 | Create fade-in, scale-up, or other complex reveal-type effects on elements as they enter and exit the scrollport (or viewport) while the user is sc… |
| `scroll-snap-realtime-feedback` | Scroll Snap Real-Time Feedback | 吸附实时反馈、轮播实时反馈 | Provide real-time visual feedback in linked UI elements while a user scrolls through snap-aligned content, before the scroll gesture completes. |
| `scroll-snap-state-sync` | Scroll Snap State Sync | 吸附状态同步、当前页同步 | Synchronize navigation indicators, linked content panels, and analytics tracking with the actively snapped item in a scrollable container. |
| `scroll-target-on-load` | Set a scroll target for the initial render | 加载定位、锚点滚动、深链定位 | Build a scrollable list of elements (e.g. a carousel of images or a chat conversation thread) that can be displayed with a particular element scrol… |
| `scrollytelling` | Scrollytelling | 滚动叙事、滚动故事、滚动长图 | Animate visual properties on a target element — such as fading a backdrop, shifting a background color, or to create scrollytelling experiences — d… |
| `search-hidden-content` | Search hidden content | 搜索隐藏内容、页内搜索展开 | Hide content from view using patterns such as accordions, tabs, and "Read more" sections, while ensuring the hidden text reveals itself during nati… |
| `sortable-table` | Sortable Table | 可排序表格、表格排序 | Progressively enhance a data table with behaviors that allow users to sort rows by clicking on column headers. |
| `spatial-navigation` | Spatial Navigation (Directional Keypad Focus) | 空间导航、遥控器导航、方向键导航 | Implement accessible spatial navigation using arrow keys that works correctly in different layout modes (grid etc) |
| `swipe-to-remove` | Swipe to remove | 滑动删除、侧滑删除 | Let users act on items in a list (remove, archive, mark as read, etc.) with a horizontal swipe gesture, so they can process entries quickly without… |
| `swipe-to-reveal` | Swipe to reveal | 滑动显现、侧滑操作、滑动露出按钮 | Let users swipe horizontally on a list item or content pane to reveal contextual action buttons or a side menu without automatically triggering an … |

## UI 组件（ui-components，22 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `accordion` | Accordion | 手风琴、折叠面板、折叠展开、常见问题 | Build an accordion component with animation, optional exclusive (one-open-at-a-time) behavior, and brand-consistent styling. |
| `app-menus` | Build an application menu bar | 应用菜单、主菜单、菜单面板 | Build an application menu bar where several top-level menus (such as File, Edit, and View) act as a single keyboard stop and switch between each ot… |
| `breadcrumbs` | Build breadcrumbs | 面包屑、路径导航 | Build a breadcrumb trail that shows the user's location within a site hierarchy and lets them navigate to ancestor pages. |
| `card` | Build a Card | 卡片、卡片布局 | Build a card component that adapts its presentation to its own available space and contents. |
| `carousel` | Build a carousel | 轮播、走马灯、图片轮播 | Build a carousel component that displays a set of items in a horizontal or vertical layout. |
| `checkbox` | Styling Checkboxes | 复选框、勾选框、多选 | Style checkboxes, including custom icons, layout, colors, check/uncheck animations, while preserving native functionality and accessibility. |
| `copy-button` | Copy button | 复制按钮、一键复制、复制到剪贴板 | Build a copy button that copies text from arbitrary elements to the clipboard. |
| `dark-mode-toggle` | Dark mode toggles | 暗色切换、主题切换按钮、明暗切换 | Build a dark mode toggle component that allows users to override their system color scheme preference for the current site. |
| `dialog` | Dialog | 对话框、模态框、弹窗、确认框、模态对话框、删除确认 | Build a modal or non-modal dialog component that is accessible, manages focus appropriately, and can be dismissed the way users expect on each plat… |
| `hovercard` | Build an interactive hovercard | 悬浮卡、悬停卡片、悬浮详情 | Build a hovercard component that displays an interactive structured preview of the page a certain type of link (e.g. a user profile) will navigate … |
| `menu` | Build a popup menu | 菜单、下拉菜单、操作菜单 | Build a menu component that displays a list of options or actions, with support for nested submenus. |
| `navbar` | Responsive Site Navigation | 导航栏、顶栏、顶部导航、吸顶导航 | Build a site navigation bar that adapts across screen sizes and indicates the current page. |
| `navigation-drawer` | Navigation Drawer | 抽屉导航、侧滑菜单、侧边导航、汉堡菜单 | Create a navigation drawer component that, when triggered from a menu button, slides in from the side overlaid on top of existing page content, and… |
| `persistent-app-tours` | Creating Persistent App Tours | 新手引导、产品导览、引导提示 | Create persistent onboarding walkthroughs using tethered native overlays that stay open during user interaction. |
| `persistent-toast-notifications` | Creating Toast Notifications | 通知、轻提示、toast、操作反馈、消息提醒 | Create non-intrusive toast and overlay notifications for persistent, stackable messaging and state communication. |
| `progress-ring` | Progress ring | 环形进度、圆形进度条、进度环 | Build a progress ring component that visually represents the completion status of a task or process, with support for content in the center and bra… |
| `progress` | Build a Styled Progress Bar | 进度条、任务进度、上传进度 | Build a styled progress bar that communicates completion of a task or process, in both determinate and indeterminate states. |
| `scrollspy` | Build a Scrollspy Navigation | 滚动高亮、目录高亮、当前章节高亮 | Highlight the currently visible section of a page in a navigation menu |
| `spinner` | Loading spinner | 加载转圈、loading、加载指示器、转菊花 | Build a loading spinner that communicates busy state to all users, respects reduced-motion preferences, and animates efficiently. |
| `stack-drill-down` | Stack Drill Down | 层级下钻、移动端导航返回、全屏层级导航 | Build full-screen hierarchical navigation that lets users drill down into nested views and swipe or navigate back to return, with browser history k… |
| `tabs` | Tabbed interfaces | 标签页、选项卡、tab 切换 | Build a responsive tabbed interface with good UX when not all tabs fit on screen. |
| `toolbar` | Build a toolbar | 工具栏、操作栏、工具条 | Build a toolbar component that displays a set of controls for performing actions. |

## 用户体验（user-experience，3 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `content-first-noise-reduction` | Maximize content and reduce noise | 内容优先、减少干扰、去噪设计 | Maximize content and reduce noise by removing blocking popups, keeping persistent navigation compact, and moving secondary content behind on-demand… |
| `form-factor-adaptation` | Adapt to the form factor | 形态适配、触控适配、设备适配 | Adapt layouts, controls, and text to any device or container so touch targets stay usable, content fits its space, and nothing collides with system… |
| `natural-interactions` | Implement natural interactions | 自然交互、悬停反馈、按压反馈 | Implement natural interactions with clear hover, focus, and press feedback, motion that opens from its trigger, swipeable content, and keyboard-rea… |

## 视觉设计（visual-design，22 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `adapt-scrollbar-to-contrast-preferences` | Adapt scrollbar to high-contrast preferences | 高对比滚动条、对比度偏好滚动条 | Enhance scrollbar visibility for users who prefer high-contrast interfaces |
| `apply-webgl-shaders` | Apply WebGL shaders to HTML content | WebGL 着色器、自定义着色器效果、GPU 效果 | Apply custom visual effects with WebGL shaders to HTML content. |
| `browser-ui-theming` | Theming browser-generated UI | 浏览器UI主题、选区与滚动条主题、原生控件配色 | Theme browser-generated UI such as text selection, scrollbars, form controls, and pickers with CSS instead of re-creating it with custom elements. |
| `color` | Color | 颜色系统、配色、对比度、明暗配色 | Color guidance for the web, including contrast requirements, light and dark color schemes, Forced Colors Mode, and generating tints and shades from… |
| `complex-shapes` | Complex Shapes | 复杂形状、clip-path 形状、异形裁剪 | Clip elements and their content to any free-form shape, like a symbol, brush stroke, or organic texture for more expressive designs. |
| `contrast-color` | Ensure text readability with dynamic background colors | 对比色、自动文字颜色、背景色上取可读文字色 | Select a readable text color with sufficient contrast on a dynamic background color. |
| `custom-text-decorations` | Custom text decorations | 文本装饰线、下划线样式、删除线动画 | Add text decorations such as underlines, overlines, strikethroughs, or entirely custom shapes, with reveal animations, custom offsets and end inset… |
| `customize-scrollbar-color-and-thickness` | Customize the color or thickness of a scrollbar | 滚动条颜色、滚动条粗细、自定义滚动条、滚动条样式 | Customize the color or thickness of a scrollbar |
| `dark-mode` | Dark mode | 暗色模式、深色模式、夜间模式、主题色 | Implement dark mode support in a way that respects the user's light/dark theme preference and adapts browser UI (e.g. scrollbars, form controls, etc) |
| `equal-width-text-lines` | Equal-Width Text Lines | 等宽文本行、标题每行等宽、叠排标题 | Make every line of a multi-line heading or lockup span the same width, as in poster-style or stacked-headline typography. Unlike justified text, th… |
| `export-html-media-from-canvas` | Export HTML content from canvas | 导出画布、HTML 转图片、截图导出 | Capture and export dynamic HTML content as images or video frames from within canvas. |
| `expose-canvas-content-to-browser-features` | Expose canvas content to browser features | 画布可访问、画布内容可搜索、canvas 语义 | Expose content rendered in a canvas to browser features like assistive technologies, translation, or reading mode. |
| `improve-text-layout-and-legibility` | Improve Text Layout and Legibility | 文本排版、换行平衡、标题断行 | Improve the layout and legibility of short standalone text content, such as headings no longer than a few lines, by enabling the browser to apply e… |
| `interactive-content-in-3d-scenes` | Enable interactive HTML content in 3D scenes | 3D 场景交互、3D 中嵌入HTML | Integrate interactive HTML elements into a 3D scene. |
| `precise-text-alignment` | Precise Text Alignment | 文本精确对齐、文字与图标对齐、视觉对齐 | Achieve precise vertical alignment with text of any font. For example, exactly equal visual padding above and below text, or aligning text perfectl… |
| `shaped-cutouts` | Shaped Cutouts | 形状镂空、缺口形状、组合裁切 | Combine multiple shapes to create complex cutouts or 'knockout' effects in elements, such as adding a notch to an element. |
| `soft-edge-content-fade` | Soft Edge Content Fade | 边缘渐隐、内容淡出遮罩、渐隐提示 | Apply a transparency gradient to content edges to indicate further scrollable areas or to obscure payment-walled text. |
| `typography` | Typography | 排版、字体、行高、字号 | Typography best practices for the web, including font sizing units, line height, text wrapping and balancing, and fluid type that scales with the v… |
| `visual-effects` | Visual effects | 视觉效果、渐变、阴影、纹理图案 | Visual effects with CSS such as layered shadows, blend modes, gradients with predictable color interpolation, and patterns like stripes, checkerboa… |
| `visually-stable-font-fallbacks` | Visually Stable Font Fallbacks | 字体回退、字体切换不跳动、FOUT | Define font styles such that text remains readable and visually consistent in the event that there's a swap between the preferred font and one of t… |
| `visually-stable-mixed-fonts` | Visually Stable Mixed Fonts | 混排字体、中英混排、多字体一致 | Define font styles such that text remains readable and visually consistent in situations where multiple fonts are used to render a single block of … |
| `visually-texture-content` | Visually Texture Content | 纹理质感、做旧效果、材质感 | Apply realistic weathering and texture patterns to elements to give them an organic, aged, or physical material appearance. |

## WebAssembly（wasm，1 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `cpp-on-the-web` | Compiling C and C++ to WebAssembly with Emscripten | C++ 编译到 Web、Emscripten、WASM 编译 | Compile C/C++ to WebAssembly using Emscripten |

## WebMCP（AI Agent 工具化）（webmcp，3 篇）

| id | 标题 | 中文触发词 | 描述 |
| :--- | :--- | :--- | :--- |
| `agentic-forms` | Agentic Forms | 表单暴露给 AI、声明式 AI 工具 | Expose client-side functionality as tools to AI agents by annotating standard HTML forms with WebMCP attributes. |
| `agentic-javascript-tools` | Agentic JavaScript Tools | JS 函数暴露给 AI、命令式 AI 工具、网页功能暴露给AI、JS函数暴露 | Programmatically register client-side JavaScript functions as tools for AI agents using the WebMCP Imperative API. |
| `webmcp` | WebMCP | WebMCP、网页暴露给 AI、AI Agent 工具、网页功能暴露给AI、暴露给AI、网页工具化 | Use this guide to implement WebMCP in browser applications, exposing client-side functionality as tools to AI agents via declarative or imperative … |

## Chrome 扩展（独立技能包）

| id | 分组 | 说明 |
| :--- | :--- | :--- |
| `chrome-extensions` | skill | Build production-quality Chrome extensions using Manifest V3 and publish them to the Chrome Web Store. |
| `api-calling` | extensions | Ordinarily, fetch requests made by extensions follow normal CORS rules. |
| `auth-identity` | extensions | { "permissions": ["identity"], "oauth2": { "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com", "scopes": [ "https://www.googleapis.com |
| `content-scripts` | extensions | { "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content/content.js"], "css": ["content/content.css"], "run_at": "document_idle" } |
| `context-menus` | extensions | { "permissions": ["contextMenus"] } |
| `csp-sandbox` | extensions | Chrome Extensions enforce a strict Content Security Policy that cannot be relaxed for extension pages (popup, side panel, options, new tab,  |
| `declarative-net-request` | extensions | { "permissions": ["declarativeNetRequest"], "declarative_net_request": { "rule_resources": [{ "id": "ruleset_1", "enabled": true, "path": "r |
| `devtools` | extensions | { "devtools_page": "devtools/devtools.html" } |
| `icons` | extensions | If generating real icon files is impractical, **omit `icons` and `default_icon` from manifest.json entirely**. Chrome uses a default puzzle- |
| `media-capture` | extensions | Prefer `tabCapture` when you only need the current tab — it requires no user chooser dialog and no `"tabs"` permission. Use `desktopCapture` |
| `message-passing` | extensions | // sender (popup, content script, etc.) chrome.runtime.sendMessage({ type: 'LOG', data: 'hello' }); |
| `omnibox` | extensions | { "omnibox": { "keyword": "wiki" } } |
| `permissions` | extensions | These are separate manifest keys — don't conflate them: |
| `popup-ui` | extensions | { "action": { "default_popup": "popup/popup.html", "default_icon": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/ico |
| `prompt-api` | extensions | The `LanguageModel` API (Prompt API) works in all extension contexts — service worker, popup, side panel, and other extension pages — with n |
| `service-worker` | extensions | Chrome terminates extension service workers after ~30 seconds of inactivity. Unlike Manifest V2 persistent background pages, you CANNOT rely |
| `side-panel` | extensions | Add to manifest.json: |
| `storage` | extensions | Permission required: `"storage"` |
| `tab-management` | extensions | { "permissions": ["tabs", "tabGroups"] } |
| `user-scripts` | extensions | The `chrome.userScripts` API lets extensions run **arbitrary code provided by the user** at runtime — code that cannot be shipped as part of |
| `chromewebstore-template` | webstore | Copy this template into the project root as `CHROMEWEBSTORE.md` and fill in each section. Fields marked `[REQUIRED]` must be completed befor |
| `privacy-policy` | webstore | A privacy policy URL is **required** if your extension: |
| `review-checklist` | webstore | Run through this checklist before every submission to the Chrome Web Store. Each item corresponds to a common rejection reason or publishing |
| `store-listing` | webstore | This appears in search results and category pages. It's your elevator pitch. Rules: |
