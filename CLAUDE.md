# Visual Testing Agent — Project Instructions

This is a standalone visual regression testing tool + agent persona, extracted and made
independent from `agentic-qe`'s `qe-visual-tester` subagent. See [`AGENT.md`](./AGENT.md) for
the full agent persona/behavior and [`README.md`](./README.md) for setup, usage, and what
changed versus the original.

## Working in this repo

- Source lives in `src/`; run commands via `npx tsx src/cli.ts <command>` during development,
  or `npm run build && node dist/cli.js <command>` for compiled use.
- Baselines (`.visual-tests/baselines/*.png`) are the source of truth — commit them.
  `.visual-tests/current/`, `.visual-tests/diffs/`, `.visual-tests/reports/` are generated and
  gitignored.
- Never hand-edit a baseline PNG; regenerate it with `--update-baseline` after confirming the
  new appearance is correct.
- When adopting the `AGENT.md` persona (e.g. asked to "act as the visual tester"), follow its
  "Default behavior" section — act immediately, don't ask before running a capture/compare.

## Adding features

- Keep the CLI dependency-light: Playwright (capture), pixelmatch + pngjs (pixel diff),
  commander (CLI). Don't reintroduce a framework dependency (memory DB, swarm orchestrator,
  CLI-of-CLIs) — the whole point of this extraction is that it runs entirely on its own.
- If you add cross-browser support, thread it through `capture.ts`'s `BrowserCapture` class
  rather than branching in `cli.ts`.
