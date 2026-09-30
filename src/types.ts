export interface Viewport {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

export interface CaptureOptions {
  fullPage?: boolean;
  waitForSelector?: string;
  waitForTimeout?: number;
  hideSelectors?: string[];
  maskSelectors?: string[];
  navigationTimeout?: number;
  clickSelectors?: string[];
  storageStatePath?: string;
}

export interface Screenshot {
  id: string;
  name: string;
  url: string;
  viewport: Viewport;
  path: string;
  timestamp: string;
  fullPage: boolean;
  captureTimeMs: number;
}

export type DiffStatus =
  | 'baseline-created'
  | 'baseline-updated'
  | 'identical'
  | 'passed'
  | 'failed'
  | 'size-mismatch';

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffPixelCount: number;
  significance: 'low' | 'medium' | 'high';
}

export interface VisualDiffResult {
  name: string;
  viewport: string;
  url?: string;
  status: DiffStatus;
  passed: boolean;
  similarity: number;
  perceptualSimilarity?: number;
  diffPixelCount: number;
  totalPixels: number;
  diffPercentage: number;
  threshold: number;
  width: number;
  height: number;
  regions: DiffRegion[];
  baselinePath: string;
  currentPath: string;
  diffImagePath?: string;
  durationMs: number;
  error?: string;
}

export interface PageTarget {
  name: string;
  url: string;
  fullPage?: boolean;
  waitForSelector?: string;
  waitForTimeout?: number;
  hideSelectors?: string[];
  maskSelectors?: string[];
  clickSelectors?: string[];
}

export interface AuthConfig {
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  username?: string;
  password?: string;
  usernameEnv?: string;
  passwordEnv?: string;
  waitForSelector?: string;
  waitForTimeout?: number;
  storageStatePath?: string;
  reuseExisting?: boolean;
}

export interface RunConfig {
  baseUrl?: string;
  pages: PageTarget[];
  viewports: string[];
  threshold?: number;
  pixelSensitivity?: number;
  outputDir?: string;
  updateBaselines?: boolean;
  auth?: AuthConfig;
}
