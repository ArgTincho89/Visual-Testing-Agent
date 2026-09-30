import * as fs from 'node:fs';
import * as path from 'node:path';
import type { VisualDiffResult } from './types.js';

export interface RunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  newBaselines: number;
  durationMs: number;
  results: VisualDiffResult[];
}

export function summarize(results: VisualDiffResult[], durationMs: number): RunSummary {
  return {
    totalTests: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    newBaselines: results.filter((r) => r.status === 'baseline-created').length,
    durationMs,
    results,
  };
}

export function writeJsonReport(summary: RunSummary, filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
}

export function writeMarkdownReport(summary: RunSummary, filePath: string): void {
  const lines: string[] = [];
  lines.push('# Visual Regression Test Report');
  lines.push('');
  lines.push(`- Total: ${summary.totalTests}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push(`- New baselines: ${summary.newBaselines}`);
  lines.push(`- Duration: ${summary.durationMs}ms`);
  lines.push('');
  lines.push('| Test | Viewport | Status | Similarity | Diff % | Regions |');
  lines.push('|------|----------|--------|-----------|--------|---------|');
  for (const r of summary.results) {
    lines.push(
      `| ${r.name} | ${r.viewport} | ${r.status} | ${(r.similarity * 100).toFixed(2)}% | ${r.diffPercentage.toFixed(3)}% | ${r.regions.length} |`
    );
  }

  const failing = summary.results.filter((r) => !r.passed && r.status !== 'baseline-created');
  if (failing.length) {
    lines.push('');
    lines.push('## Regressions');
    for (const r of failing) {
      lines.push('');
      lines.push(`### ${r.name} (${r.viewport})`);
      lines.push(`- Status: ${r.status}`);
      lines.push(`- Similarity: ${(r.similarity * 100).toFixed(2)}%`);
      lines.push(`- Diff pixels: ${r.diffPixelCount} / ${r.totalPixels}`);
      if (r.diffImagePath) lines.push(`- Diff image: ${r.diffImagePath}`);
      if (r.regions.length) {
        lines.push('- Regions:');
        for (const region of r.regions.slice(0, 5)) {
          lines.push(
            `  - (${region.x}, ${region.y}) ${region.width}x${region.height} — ${region.significance} significance, ${region.diffPixelCount}px`
          );
        }
      }
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}
