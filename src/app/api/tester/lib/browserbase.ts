/**
 * Browserbase integration for automated browser testing
 * Uses Browserbase's remote browser infrastructure with Playwright
 */

import { chromium } from 'playwright-core';

export interface BrowserbaseConfig {
  apiKey: string;
  projectId?: string;
  enableDebug?: boolean;
}

/**
 * Get Browserbase configuration from environment variables
 */
export function getBrowserbaseConfig(): BrowserbaseConfig {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey) {
    throw new Error('BROWSERBASE_API_KEY is not configured in environment variables');
  }

  return {
    apiKey,
    projectId,
    enableDebug: process.env.NODE_ENV === 'development',
  };
}

/**
 * Connect to Browserbase remote browser
 */
export async function connectToBrowserbase(config: BrowserbaseConfig) {
  const browserWSEndpoint = `wss://connect.browserbase.com?apiKey=${config.apiKey}${
    config.projectId ? `&projectId=${config.projectId}` : ''
  }`;

  if (config.enableDebug) {
    console.log('[Browserbase] Connecting to remote browser...');
  }

  const browser = await chromium.connectOverCDP(browserWSEndpoint);

  if (config.enableDebug) {
    console.log('[Browserbase] Connected successfully');
  }

  return browser;
}

/**
 * Check if Browserbase is configured
 */
export function isBrowserbaseConfigured(): boolean {
  return !!process.env.BROWSERBASE_API_KEY;
}

/**
 * Fallback to local Playwright if Browserbase is not configured
 */
export async function connectToLocalBrowser() {
  console.log('[Browser] Using local Playwright browser...');

  try {
    const browser = await chromium.launch({
      headless: true,
      // Windows-specific args to help with localhost connections
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    console.log('[Browser] ✅ Local browser launched successfully');
    return browser;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Executable doesn\'t exist')) {
      throw new Error(
        'Chromium browser not found. Please run: npx playwright install chromium'
      );
    }
    throw error;
  }
}

/**
 * Smart browser connection - uses Browserbase if available, falls back to local
 * @param forceLocal - Force local browser even if Browserbase is configured (needed for localhost URLs)
 */
export async function connectToBrowser(forceLocal: boolean = false) {
  // Always use local browser for localhost URLs
  if (forceLocal) {
    console.log('[Browser] Using local browser (forced for localhost testing)');
    return await connectToLocalBrowser();
  }

  if (isBrowserbaseConfigured()) {
    try {
      const config = getBrowserbaseConfig();
      return await connectToBrowserbase(config);
    } catch (error) {
      console.error('[Browserbase] Failed to connect:', error);
      console.log('[Browser] Falling back to local browser...');
      return await connectToLocalBrowser();
    }
  } else {
    console.log('[Browser] Browserbase not configured, using local browser');
    return await connectToLocalBrowser();
  }
}
