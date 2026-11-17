---
name: modern-web-guidance-router
description: |
  Offline, zero-network knowledge router for the local modern-web-guidance repository (209 guides + 22 Chrome extension references + 250-feature catalog). Use it FIRST before writing or changing any HTML, CSS, or client-side JavaScript — modern web APIs evolve fast and model weights contain obsolete patterns.
  Triggers: dialogs/modals/popovers, tables, dark mode, anchor positioning, container queries, view transitions, scroll-driven animation, parallax/reveals, forms, validation, autofill, accessibility, custom selects, scrollbars, Core Web Vitals (LCP/INP/CLS), content-visibility, fetch priority, image optimization, security, passkeys, HTML sanitization, web components, dates/timezones, built-in AI, WebAssembly, WebMCP, standard HTML/CSS/DOM inside any framework, Chrome extension pages.
  中文触发：对话框/弹窗/模态、表格、暗色模式、锚点定位、容器查询、视图过渡、滚动驱动动画、视差、表单、校验、自动填充、可访问性/无障碍、自定义选择器、滚动条、性能优化/首屏/LCP/INP/CLS、图片优化、安全/XSS、通行密钥、Web 组件、日期时区、浏览器内置 AI、WebAssembly、Chrome 扩展。
  DO NOT trigger for: backend (SQL, ORMs, API routes), infra (CI/CD, Docker, Actions, Python/Go, Git), or tooling/trivial tasks (Vite, tsconfig, ESLint, tests, copy/rename).
---

# Modern Web Guidance Router（离线知识路由）

This repository ships the full modern-web-guidance corpus as plain Markdown. This skill resolves a
developer intent to the right guide **locally, with zero network calls**, then tells you where to read it.
It is the offline replacement for `npx modern-web-guidance search/retrieve`.

The moment you are about to write, review, or modernize UI code — layouts, components, animation,
forms, accessibility, performance, security on the client — run one `search` first.

## Repository facts (verified)

| Fact | Value |
| :--- | :--- |
| Repo root | the directory containing `skills/modern-web-guidance/guides/` (this repo) |
| Use-case + discipline guides | 209 Markdown files in `skills/modern-web-guidance/guides/<category>/<id>.md` |
| Curated use-case descriptions | 203, injected in `README.md` between `INJECT_SKILL_COVERAGE_START/END` |
| Categories | 17 (accessibility, built-in-ai, css, forms, html, js, performance, privacy, pwa, security, ui-atoms, ui-behaviors, ui-components, user-experience, visual-design, wasm, webmcp) |
| Discipline guides (cross-cutting, always relevant when the topic matches) | `accessibility`, `css`, `forms`, `html`, `performance`, `privacy`, `security`, `motion`, `color`, `typography`, `visual-effects`, `webmcp` |
| Chrome extensions skill | separate skill pack: `skills/chrome-extensions/SKILL.md` + 22 references (19 extension APIs + 4 Web Store) |
| Feature catalog | 250 Baseline-tracked features listed in `README.md` |
| Guide id | file name without `.md` (e.g. `ui-components/dialog.md` → `dialog`) |
| Upstream skill version | read from `skills/modern-web-guidance/SKILL.md` (`--skill-version`) — currently `2026_11_09-5bcc021b` |

If a skill runner reports a **Base directory for this skill**, the commands below are
`<base>/scripts/mwg.mjs`; from the repository root they are
`node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs`.

## Mandatory workflow

### Step 1 — Search (one search per capability)

```sh
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs search "<2-5 word intent>"
```

**Faster single-guide lookup:** when you only need the best guide for one capability, use `brief`
instead of `search` + `retrieve` — it routes and prints the full top guide in **one process** (≈2×
faster, ~86% less routing overhead):

```sh
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs brief "<2-5 word intent>"
# add --two to also load a close second guide (e.g. a behavior companion) in the same call
```

Use `search` when you must compare several candidates or need `--json`.

- Write the query as **verb/action + concrete UI or platform noun**: `light dismiss dialog`,
  `responsive data table`, `dark mode scrollbar`, `animate accordion height`.
- **Chinese queries work directly** (`暗色模式 滚动条`, `响应式表格`, `删除前确认 对话框`) — the tool
  expands Chinese terms through `references/zh-glossary.json` (185 terms) and curated per-guide aliases.
- **Do not** put framework names (React/Vue/Tailwind), app nouns (product/page names), or file names
  in the query. Do not stack two capabilities in one query — split and search again.
- If the user's intent does not name a UI primitive ("confirm first", "pick a date"), search the
  **implied primitive**: `confirmation dialog`, `date picker`, not the domain phrasing.
- Weak or empty results: rephrase **once** with a more concrete primitive or a synonym
  (`drawer` ↔ `sidebar`, `toast` ↔ `notification`, `弹窗` ↔ `对话框`), then try `map <category>` or
  `list` to browse. If the topic is genuinely uncovered, say so and proceed without a guide.

### Step 2 — Pick the guides

Use the results' `description` to judge relevance, then select:

1. the **use-case guide** for the specific component/behavior (e.g. `dialog`, `light-dismiss-a-dialog`);
2. the **discipline guide** for the underlying discipline when the task touches it (`css`, `forms`,
   `accessibility`, `performance`, `security`, `motion`, `typography`, `color`, `visual-effects`);
3. **sibling guides** the chosen guide itself references (they contain mandatory companion rules).

Prefer 1–3 guides. Do not retrieve the whole catalog — guides are dense and token-expensive.

### Step 3 — Retrieve

```sh
node .agents/skills/modern-web-guidance-router/scripts/mwg.mjs retrieve "dialog,light-dismiss-a-dialog"
```

`retrieve` prints the full Markdown (multiple ids separated by commas). Read the whole guide; if a
guide is long, read the relevant sections in full before coding. Alternatively
`retrieve "<id>" --path` returns the absolute path and you read it with the file tool.

### Step 4 — Apply and verify

- Adapt vanilla HTML/CSS/JS to the project's framework **without dropping the modern platform feature**:
  - **Types**: spread/cast newly shipped attributes (`{...({ popover: 'hint', commandfor: id, switch: '' } as any)}`) rather than deleting them or merging `@types/react`.
  - **SSR & bundlers**: guard `window`/`HTMLElement` in SSR; load polyfills via `import('<pkg>')` in client effects (or set Vite `build.target: 'esnext'` for top-level `await`); never copy files out of `node_modules`.
  - **DOM, ids, CSS**: call `showModal()`/`moveBefore()` on refs for non-VDOM-managed nodes; generate per-instance ids/`anchor-name`s (`useId()`); keep `:root` and `@starting-style` top-level/unscoped.
- Follow the guide's **DO / DON'T** rules and its mandatory CSS/JS snippets literally — they encode
  hard-won pitfalls (focus handling, top-layer behavior, scroll containment, validation timing).
- **Baseline / fallbacks**: assume *Baseline widely available* features are safe. For features that are
  not, follow the guide's fallback recommendation unless the user set an explicit browser policy.
  Never ship a heavy polyfill where the guide prescribes a small custom fallback.
- **Verify before claiming done**: run the `frontend-verification` skill (if installed) for real-browser
  evidence (screenshots, console, computed styles, a11y, responsive). Cross-check the implementation
  against the retrieved guide before concluding.
- Do **not** run `legacy-scan` for a specific feature task; it is only for broad, open-ended
  modernization of an existing codebase (see below).

### Step 5 — Disclose

End the response that delivers the change with a `### Modern Web Guidance` section:

- If retrieved guides shaped the code: **one bullet per newly applied guide id** (1–2 sentences,
  ≤75 words), first person, explaining the non-obvious API/override/fallback the guide required and
  the pitfall it prevented, anchored by a **short verbatim quote** of that specific rule or gotcha
  (not the guide's overview intro):
  `- **\`<id>\`**: <what you applied and the pitfall prevented> ("<short verbatim quote>").`
- Never guess ids or quotes from memory after context compaction — re-run `search`/`retrieve` first.
- If you searched/listed but applied no guide (e.g. topic not covered), write one sentence naming
  what you checked and why nothing applied.

## Query cookbook

| User intent | Search query | Expected ids |
| :--- | :--- | :--- |
| "make a confirm dialog" / "删除前确认" | `confirmation dialog` / `删除前确认 对话框` | `dialog` (+ `light-dismiss-a-dialog`, `prevent-page-scroll-under-modal-dialog`) |
| "click outside closes it" / "点击外部关闭" | `light dismiss dialog` / `点击外部关闭` | `light-dismiss-a-dialog` |
| "dark mode with theme switch" / "暗色模式切换" | `dark mode toggle` / `暗色模式` | `dark-mode-toggle`, `dark-mode`, `color` |
| "scrollbar colors" / "滚动条样式" | `customize scrollbar` / `滚动条样式` | `customize-scrollbar-color-and-thickness` |
| "responsive table" / "响应式表格" | `responsive table` / `响应式表格` | `responsive-table` (+ `sortable-table`) |
| "page transition" / "页面切换动画" | `view transition pages` / `页面切换` | `cross-document-transitions`, `same-document-transitions`, `faster-spa-view-transitions` |
| "dialog open animation" / "弹窗动画" | `animate dialog top layer` / `弹层动画` | `animate-to-from-top-layer` |
| "form validation timing" / "表单校验时机" | `validate input after interaction` / `表单校验` | `validate-input-after-interaction`, `accessible-error-announcement` |
| "autofill address" / "地址自动填充" | `autofill address form` | `autofill-address-form` (+ `autofill-highlight-inputs`) |
| "images load slowly" / "图片加载慢" | `image priority` / `图片优先级` | `optimize-image-priority`, `deliver-optimized-decorative-images` |
| "slow interactions" / "交互卡顿" | `identify INP causes` / `交互延迟` | `identify-inp-causes`, `break-up-long-tasks` |
| "sanitize user HTML" / "用户 HTML 注入" | `sanitize untrusted HTML` | `sanitize-untrusted-html`, `trusted-types` |
| "passkey login" / "通行密钥登录" | `passkey authentication` | `passkeys`, `passkey-authentication` |
| "container queries" / "容器查询" | `container query` / `容器查询` | `size-aware-styling` |
| "tooltip placement" / "提示框定位" | `tooltip positioning` | `position-aware-tooltips`, `viewport-aware-dropdowns` |
| "Chrome extension side panel" / "扩展侧边栏" | `side panel` / `扩展 侧边栏` | `side-panel` (chrome-extensions) |

## Command reference

| Command | Purpose |
| :--- | :--- |
| `brief "<query>" [--two] [--head N]` | **one-shot**: route + print the top guide (and optional runner-up) |
| `search "<query>" [--limit 8] [--json] [--category css] [--discipline] [--paths]` | rank guides for an intent |
| `retrieve "<id>[,<id>...]" [--path] [--head N]` | print full guide(s) or their paths |
| `cats` | categories + discipline-guide list |
| `map [category]` | compact `id — title — 中文触发词` table (browse/audit) |
| `list [category]` | all ids in a category |
| `stats` | counts, upstream skill version, index freshness |
| `check` | validate the index against the repository files |
| `features "<name>"` | search the 250-feature Baseline catalog |
| `glossary [term]` | inspect the Chinese→English query vocabulary |
| `refs [group]` | Chrome extension references (`extensions` / `webstore`) |
| `routes` | the generated per-category routing table |
| `node scripts/selftest.mjs` | 48-case bilingual routing regression battery |

Search output is compact by default; use `--json` when you need to filter programmatically.
When the index is stale (`stats` says STALE, or new guides were pulled), rebuild it:

```sh
node .agents/skills/modern-web-guidance-router/scripts/build-index.mjs
```

## Coverage boundaries

- **Covered**: client-side web platform — HTML semantics, CSS layout/styling/animation, forms,
  accessibility, performance/Core Web Vitals, security/PII, passkeys, PWA, built-in AI, wasm, WebMCP,
  and Chrome extension pages/APIs/Web Store publishing.
- **Not covered**: server-side frameworks, databases/ORMs, API route design, build tooling, CI/CD,
  Git, Docker, test runners. Do not invent guide ids for those.
- **Chrome extension work**: load the `chrome-extensions` skill first; use
  `mwg.mjs refs extensions` / `refs webstore` to pick the specific reference, then `retrieve "<id>"`.

## Modernization flow (broad, open-ended only)

Only when the user asks for a broad legacy-pattern scan/modernization (not a named feature/component):
`npx -y modern-web-guidance@latest legacy-scan <path> --json` (needs network). Without network, grep
for the legacy patterns the discipline guides name (e.g. `role="dialog"` on `<dialog>`, focus-trap
libraries, `addEventListener('scroll')` for scroll effects), verify each hit against its guide's
`keepWhen`/`dropWhen` intent, then retrieve the guide and modernize. `legacy-scan` only covers the
~20% of the catalog with deterministic legacy rules — say so in the report.

## Operating rules

1. **Never hallucinate guide ids or quotes.** Every id you cite must come from this tool's output in
   the current turn.
2. **Search before coding, not after.** Re-run search/retrieve if context was compacted.
3. **Keep queries generic and single-purpose**; one capability per search.
4. **Token discipline**: retrieve only what the task needs; do not dump guides into the final answer.
5. **Respect fallback policy**: always implement the fallback the guide mandates for non-Baseline
   features; if the user has a custom browser-support policy, follow it.
6. **Offline first**: the local index is the source of truth. Use `npx -y modern-web-guidance@latest`
   only when the local repository is unavailable (then pin the skill version printed by `stats`).

## When this skill is unavailable

If this repository/harness is not present, fall back to
`npx -y modern-web-guidance@latest search "<query>" --skill-version <version>` then
`retrieve "<id>"`, with the same workflow above.
