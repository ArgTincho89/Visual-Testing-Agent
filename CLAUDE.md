# Visual Testing Agent — Project Instructions

This is a standalone visual regression testing tool, extracted and made independent from
`agentic-qe`'s `qe-visual-tester` subagent, plus a packaged, framework-agnostic skill
(`skills/visual-regression-testing/SKILL.md`) capturing the decision criteria for using it
well. See [`README.md`](./README.md) for setup, usage, and what changed versus the original;
see the skill for whether/how/what-to-mask judgment calls.

## Working in this repo

- Source lives in `src/`; run commands via `npx tsx src/cli.ts <command>` during development,
  or `npm run build && node dist/cli.js <command>` for compiled use.
- Baselines (`.visual-tests/baselines/*.png`) are the source of truth — commit them.
  `.visual-tests/current/`, `.visual-tests/diffs/`, `.visual-tests/reports/` are generated and
  gitignored.
- Never hand-edit a baseline PNG; regenerate it with `--update-baseline` after confirming the
  new appearance is correct.
- When asked to act as the visual tester directly (not via another framework invoking the
  skill), follow `skills/visual-regression-testing/SKILL.md`'s workflow and act immediately —
  capture/compare without asking for confirmation first.

## Adding features

- Keep the CLI dependency-light: Playwright (capture), pixelmatch + pngjs (pixel diff),
  commander (CLI). Don't reintroduce a framework dependency (memory DB, swarm orchestrator,
  CLI-of-CLIs) — the whole point of this extraction is that it runs entirely on its own.
- If you add cross-browser support, thread it through `capture.ts`'s `BrowserCapture` class
  rather than branching in `cli.ts`.

## How the user wants to work (learned, not assumed)

- Do only what's asked. Don't add sections, docs, or features that weren't requested, and don't
  `git push` anything that wasn't explicitly asked for — this was an explicit correction in an
  earlier session, not a style preference.
- Verify explanations against real data before stating them as fact. More than once a plausible-
  sounding mechanism turned out to be wrong (or incomplete) once the actual numbers/images were
  checked — always pull the real JSON/PNG evidence before explaining *why* something happened.
- The repo at `github.com/ArgTincho89/Visual-Testing-Agent` is **public**. Never commit real
  target-app URLs, credentials, or screenshots of someone's actual app/data to it — those stay
  local-only (see untracked files below). Ask before pushing anything that touches a real test
  target.

## Live validation target: PateSystem

All hands-on testing so far has been against a real deployed app the user provided for this
purpose: `https://patesystem.fly.dev` (hash-router SPA, personal finance tracker), login
`prueba123` / `prueba123`. Six screens: `#/home`, `#/summary`, `#/categories`, `#/goals`,
`#/estadisticas`, `#/profile`.

Local-only files (gitignored/untracked, never pushed — contain the real URL, test creds, and
real screenshots):
- `patesystem.demo.config.json` — unmasked baselines/config for all 6 screens × mobile-m/desktop-l.
- `patesystem.masked.config.json` — same 6 screens, but with aggressive masking (numbers, all
  transaction/category/goal content, charts) so the suite tolerates live/mutating data. Selectors
  were reverse-engineered from the real DOM (`.stat-value`, `.transaction-item`, `.day-header`,
  `.category-item`, `.goal-card`, `.chart-container`, `.profile-info-value`, `.avatar-placeholder`,
  bare `h2` for the month header on home/summary/estadisticas only).
- `.visual-tests/` — unmasked run evidence (first case study: a real reflow regression from a
  new transaction, correctly flagged on mobile, diluted by side-margin whitespace on desktop).
- `.visual-tests-masked/` — masked run evidence (second case study, in progress — see below).

### Open items from the masked run (not yet resolved)

1. **`categories` @ desktop-l has no valid baseline.** The original baseline was captured
   mid-page-load (shows a "Cargando..." spinner instead of the real content) — a bug in the
   initial capture, not a real app issue. It was never corrected before the user made their app
   changes, so there is currently no valid "before" state to compare against for this
   screen/viewport. Needs a decision: regenerate the baseline now (accepting it reflects the
   *post-change* state, i.e. this round's comparison for that cell is void), or find another way
   to recover a "before" state.
2. **`estadisticas` @ mobile-m has a real, unexplained diff inside a masked region.** ~94.6%
   similarity, one high-significance region at (48, 1416, 1032×192). Baseline and current look
   identical by eye at full-page level; the actual pixel difference is inside the second
   `.chart-container` mask, so its cause can't be inspected (masking hides the content, not just
   ignores it). Could be a real layout issue or just the chart growing a few px from an extra
   legend row. Unresolved — needs either an unmasked re-check of that one container, or the
   user's judgment.
3. **Two capture-timing false positives were found and partially fixed in the same run**:
   `home` @ desktop-l's first capture caught the page blank (mid-load) — retried individually and
   confirmed a real, legitimate regression underneath (the transaction list got shorter — content
   count changed, which masking never protects against, only content *value*). The aggregate
   `.visual-tests-masked/reports/latest.*` files are stale on this one row (still reflect the
   blank-page false positive) since the retry used the single-page `test` command, which doesn't
   rewrite the batch report — regenerate via `run` once the `categories` baseline question above
   is settled.

Before trusting any future run's "failed" result on this target, open the actual diff/baseline/
current PNGs — this session found three different root causes (real regression, broken baseline,
stale timing capture) behind three failures that all looked superficially similar in the summary
table.
