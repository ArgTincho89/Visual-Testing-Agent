# Visual Testing Agent

A standalone visual regression testing tool, extracted from the `qe-visual-tester` subagent in
[agentic-qe](https://github.com/ruvnet/ruflo) and stripped of every framework dependency (no
`aqe` CLI, no swarm/memory database, no queen coordinator, no proprietary browser binary). It
runs entirely on its own with three well-known open-source packages: **Playwright** (screenshot
capture) and **pixelmatch** + **pngjs** (pixel-level diffing).

See [`AGENT.md`](./AGENT.md) for the full agent persona/system-prompt you can hand to Claude
(or any LLM agent runtime) to operate this tool autonomously.

## Why this was rebuilt instead of copy-pasted

The original `qe-visual-tester.md` agent definition is a prompt spec, not code — the real
comparison logic lives in agentic-qe's `VisualTesterService` / `VisualRegressionService`.
Reading that code turned up something worth knowing before trusting it: **whenever no real
browser session (Vibium / agent-browser) is active, those services silently fall back to a
deterministic pseudo-random "diff" derived from hashing the URL string — not real pixels.** It
can report a "3.4% visual regression" that has nothing to do with what's actually on the page.
The one genuinely real, pixel-accurate implementation in that codebase is a small helper script
(`visual-diff.js`, using `pixelmatch`) buried inside a separate browser-automation skill.

This project takes that real approach (Playwright + pixelmatch) and builds it out properly:
multi-viewport support, baseline management, real region detection (not hash-based fake
coordinates), an optional structural-similarity signal, and JSON/Markdown reporting — with
nothing fabricated.

## Install

```bash
npm install
npx playwright install --with-deps chromium
```

## Quickstart

```bash
# Single page, ad-hoc
npx tsx src/cli.ts test --url https://example.com --name homepage --viewport desktop-l --full-page

# Full suite from config
cp visual.config.example.json visual.config.json   # edit baseUrl/pages
npx tsx src/cli.ts run --config visual.config.json

# Accept an intentional change
npx tsx src/cli.ts test --url https://example.com --name homepage --viewport desktop-l --update-baseline

# List built-in viewport presets
npx tsx src/cli.ts list-viewports
```

Build once you're happy with it:

```bash
npm run build
node dist/cli.js run --config visual.config.json
```

## CLI reference

| Command | Purpose |
|---|---|
| `test --url <url> --name <name>` | Capture one page/viewport and compare (or create) its baseline |
| `run --config <file>` | Batch capture+compare over a JSON config; writes JSON + Markdown reports |
| `list-viewports` | Print built-in device presets |

`test` flags: `--viewport <preset|WxH[xScale]>`, `--full-page`, `--threshold <0-1>`,
`--hide <selectors...>`, `--mask <selectors...>`, `--wait-for <selector>`,
`--update-baseline`, `--output-dir <dir>`.

## Config file (`run`)

```json
{
  "baseUrl": "https://example.com",
  "outputDir": ".visual-tests",
  "threshold": 0.01,
  "pixelSensitivity": 0.1,
  "viewports": ["mobile-m", "tablet", "desktop-l"],
  "pages": [
    { "name": "homepage", "url": "/", "fullPage": true, "hideSelectors": [".timestamp"], "maskSelectors": [".live-chat-widget"] }
  ]
}
```

### Authenticated apps (login once, reuse the session)

For an app that sits behind a login screen, add an `auth` block. It logs in once with a real
browser, saves the session (cookies + localStorage) to a JSON file via Playwright's
`storageState`, and every page capture in the run reuses that file instead of logging in again:

```json
{
  "baseUrl": "https://your-app.example.com",
  "auth": {
    "loginUrl": "https://your-app.example.com/#/login",
    "usernameSelector": "#login-username",
    "passwordSelector": "#login-password",
    "submitSelector": "form:has(#login-username) button[type=\"submit\"]",
    "usernameEnv": "QA_USERNAME",
    "passwordEnv": "QA_PASSWORD",
    "waitForSelector": ".navbar-item"
  },
  "viewports": ["mobile-m", "desktop-l"],
  "pages": [
    { "name": "home", "url": "/#/home" },
    { "name": "summary", "url": "/#/summary" }
  ]
}
```

Prefer `usernameEnv`/`passwordEnv` (read from environment variables) over inline
`username`/`password` for anything beyond a disposable local test account — the saved session
file itself is already gitignored (`.visual-tests/auth/`) since it contains live session
cookies.

If the different "pages" of the app are really tabs of the same SPA view with no distinct URL,
use `clickSelectors` on a `PageTarget` instead of `url` navigation — it clicks each selector in
sequence (e.g. a tab button) before capturing.

Standalone equivalents exist for ad-hoc use outside a config file:

```bash
npx tsx src/cli.ts login --url https://your-app/#/login \
  --user-selector "#login-username" --pass-selector "#login-password" \
  --submit-selector "form:has(#login-username) button[type=submit]" \
  --username "$QA_USERNAME" --password "$QA_PASSWORD" \
  --wait-for ".navbar-item"

npx tsx src/cli.ts test --url https://your-app/#/summary --name summary \
  --storage-state .visual-tests/auth/storageState.json
```

- `threshold` — max fraction of pixels allowed to differ before a test fails (the same
  convention Playwright's `maxDiffPixelRatio` and BackstopJS use).
- `pixelSensitivity` — pixelmatch's own per-pixel color-difference sensitivity (0-1, default
  0.1); lower = stricter about anti-aliasing.

## Masking strategy — pixels have no meaning, so someone has to decide

Pixel comparison cannot, by itself, tell "the layout broke" apart from "the data legitimately
changed" — a pixel is just a color, it carries no semantics. A dashboard showing real or seeded
transaction data will *always* produce pixel differences between runs, even when nothing is
actually wrong. This is not a bug to fix in the diff algorithm; it's a property of pixel diffing
in general, and every serious visual-regression tool (Percy, Chromatic, BackstopJS, Playwright's
own `toHaveScreenshot()`) handles it the same way: **someone tells the tool, per page, which
regions are expected to vary.** That "someone" — a human writing the config, or an orchestrator
generating it — has to know the nature of the screen being tested. This tool has no way to infer
that on its own, so treat it as a required input, not an afterthought: a static settings page and
a live transactions dashboard need different masking strategies even if they're tested with the
same command.

**How `maskSelectors` actually works** — Playwright paints a solid box directly onto the page
*before* the screenshot bytes are captured (not a post-hoc crop). Because that box is the same
solid color on every run regardless of what text/numbers are underneath, `pixelmatch` sees zero
difference there no matter how the real data changes. It neutralizes *content*, not layout: the
box's position and size are still captured and compared, so a real regression that shifts or
resizes that element is still caught.

**How `hideSelectors` actually works** — sets `visibility: hidden`, not `display: none`. That
distinction matters: `visibility:hidden` keeps the element's layout space reserved, so hiding a
banner or widget doesn't itself shift everything below it (which would be a false positive of
your own making). Use it for things that shouldn't be part of the visual check at all (ads, live
chat widgets, anything that loads asynchronously and causes flakiness).

**Prefer masking leaves, not whole containers.** Masking an entire transaction-list `<div>`
neutralizes real layout bugs inside it (an icon overlapping text, broken spacing) along with the
data. Masking just the dynamic text nodes (`.transaction-amount`, `.transaction-date`) instead
keeps the surrounding card/row structure — borders, icons, alignment — under real test.

**What masking cannot fix: reflow.** Masking freezes how a region *looks*, not how much *space*
it takes up. If the dynamic content changes the number of rows (a new transaction appears), the
page height changes and everything below it shifts by a few pixels — that shows up as dozens of
small, scattered diff regions even with masking in place, because the shift happens *outside* any
masked box. Two ways to actually solve that, not just work around it:
- Raise `threshold` for that specific page to tolerate normal reflow noise (blunt, easy, imprecise).
- Intercept the page's API calls (Playwright's `page.route()`) and serve a fixed JSON fixture
  instead of live data, so the row count — and therefore the layout — never changes between runs.
  This is the robust fix; masking alone cannot achieve it. Not implemented in this CLI yet, but
  it is the natural next enhancement given the app under test is expected to be Playwright-driven
  end to end.

## Output layout

```
.visual-tests/
  baselines/   <- commit these; they're your approved reference screenshots
  current/     <- gitignored, regenerated every run
  diffs/       <- gitignored, only written when a diff is non-empty
  reports/
    latest.json
    latest.md
    latest.html   <- baseline/current/diff images side by side, with regions drawn as overlays
```

## What's real here vs. the original framework

| Capability | agentic-qe original | This project |
|---|---|---|
| Screenshot capture | Vibium binary (proprietary, or falls back to fake metadata) | Playwright (open-source, industry standard) |
| Pixel diff | Fabricated hash-based percentage when no browser session is active | Real `pixelmatch` comparison, always |
| Diff regions | Fake coordinates derived from a hash | Real connected-component clustering of actual diff pixels |
| "AI" comparison | Claims LLM-router analysis (framework-dependent, opt-in) | Real spatial-pooling structural-similarity heuristic + you (the agent) visually inspecting the diff image |
| Baselines | SQLite-backed memory namespace | Plain PNG files on disk (portable, diffable, git-friendly) |

## License / attribution

Uses [Playwright](https://playwright.dev) (Apache-2.0) and
[pixelmatch](https://github.com/mapbox/pixelmatch) / [pngjs](https://github.com/lukeapage/pngjs)
(MIT/ISC). This project's own code has no license restriction inherited from agentic-qe — it's
a clean-room reimplementation of the *behavior* described in `qe-visual-tester.md`, not a copy
of agentic-qe's source files.
