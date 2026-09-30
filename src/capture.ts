import { chromium, type Browser } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CaptureOptions, Screenshot, Viewport } from './types.js';

export class BrowserCapture {
  private browser: Browser | null = null;

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async capture(
    url: string,
    name: string,
    viewport: Viewport,
    outputPath: string,
    options: CaptureOptions = {}
  ): Promise<Screenshot> {
    const start = Date.now();
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      userAgent: viewport.userAgent,
      storageState: options.storageStatePath,
    });

    try {
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options.navigationTimeout ?? 30000,
      });

      if (options.clickSelectors?.length) {
        for (const selector of options.clickSelectors) {
          await page.click(selector);
          await page.waitForTimeout(300);
        }
      }

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.waitForTimeout ?? 5000,
        });
      } else if (options.waitForTimeout) {
        await page.waitForTimeout(options.waitForTimeout);
      }

      if (options.hideSelectors?.length) {
        await page.evaluate((selectors) => {
          for (const sel of selectors) {
            document.querySelectorAll(sel).forEach((el) => {
              (el as HTMLElement).style.visibility = 'hidden';
            });
          }
        }, options.hideSelectors);
      }

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      const mask = options.maskSelectors?.map((sel) => page.locator(sel));

      await page.screenshot({
        path: outputPath,
        fullPage: options.fullPage ?? false,
        mask,
      });

      return {
        id: randomUUID(),
        name,
        url,
        viewport,
        path: outputPath,
        timestamp: new Date().toISOString(),
        fullPage: options.fullPage ?? false,
        captureTimeMs: Date.now() - start,
      };
    } finally {
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
