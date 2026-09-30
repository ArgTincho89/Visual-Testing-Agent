import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Viewport } from './types.js';
import { viewportKey } from './viewports.js';

export interface OutputPaths {
  baselinesDir: string;
  currentDir: string;
  diffsDir: string;
  reportsDir: string;
}

export function resolveOutputPaths(outputDir: string): OutputPaths {
  return {
    baselinesDir: path.join(outputDir, 'baselines'),
    currentDir: path.join(outputDir, 'current'),
    diffsDir: path.join(outputDir, 'diffs'),
    reportsDir: path.join(outputDir, 'reports'),
  };
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function imageName(name: string, viewport: Viewport): string {
  return `${sanitize(name)}__${viewportKey(viewport)}.png`;
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
