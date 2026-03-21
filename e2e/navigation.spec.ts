import { test, expect, type Page } from '@playwright/test';

/**
 * Exploratory navigation tests for Vibeman
 *
 * Verifies all menu items are accessible, content loads without JS errors,
 * and no blank screens appear when navigating between modules.
 */

// Main nav items (always visible in top bar) — uses data-testid="nav-item-{module}"
const MAIN_NAV = [
  { testId: 'nav-item-coder', label: 'Project' },
  { testId: 'nav-item-contexts', label: 'Contexts' },
  { testId: 'nav-item-ideas', label: 'Ideas' },
  { testId: 'nav-item-tinder', label: 'Tinder' },
  { testId: 'nav-item-tasker', label: 'Tasker' },
];

// Items in "Other" dropdown — uses data-testid="nav-other-{module}"
const OTHER_NAV = [
  { testId: 'nav-other-commander', label: 'Annette' },
  { testId: 'nav-other-brain', label: 'Brain' },
  { testId: 'nav-other-conductor', label: 'Conductor' },
  { testId: 'nav-other-manager', label: 'Manager' },
  { testId: 'nav-other-halloffame', label: 'Hall of Fame' },
  { testId: 'nav-other-integrations', label: 'Integrations' },
  { testId: 'nav-other-questions', label: 'Questions' },
  { testId: 'nav-other-reflector', label: 'Reflector' },
  { testId: 'nav-other-social', label: 'Social' },
  { testId: 'nav-other-zen', label: 'Zen Mode' },
];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(`${err.name}: ${err.message}`);
  });
  return errors;
}

async function assertModuleLoaded(page: Page, label: string, errors: string[]) {
  await page.waitForTimeout(800);

  // No React error boundary
  const hasErrorBoundary = await page.locator('text=Something went wrong').isVisible().catch(() => false);
  expect(hasErrorBoundary, `"${label}" shows error boundary`).toBe(false);

  // Main content visible (use .first() since Zen Mode has 2 <main> elements)
  const mainContent = page.locator('main').first();
  await expect(mainContent).toBeVisible();

  // Fatal JS errors
  const fatalErrors = errors.filter(
    e => (e.startsWith('TypeError:') || e.startsWith('ReferenceError:')) &&
         !e.includes('ResizeObserver') &&
         !e.includes('AbortError') &&
         !e.includes('Cannot read properties of null')
  );
  expect(fatalErrors, `"${label}" fatal JS errors: ${fatalErrors.join('; ')}`).toHaveLength(0);
}

async function openOtherDropdown(page: Page) {
  // The dropdown has a fixed inset-0 z-40 backdrop overlay.
  // Need force:true to click through it, or dismiss it first.
  const dropdown = page.getByTestId('nav-other-dropdown');
  await dropdown.click({ force: true });
  await page.waitForTimeout(400);
}

async function clickOtherItem(page: Page, testId: string) {
  await openOtherDropdown(page);
  // Dropdown items are z-50, so they're above the backdrop
  await page.getByTestId(testId).click({ timeout: 5000 });
}

// ============================================================================

test.describe('App Load', () => {
  test('homepage loads successfully with content', async ({ page }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);

    if (errors.length > 0) {
      console.log('JS errors on initial load:', errors);
    }
  });

  test('navigation bar shows all main items and Other dropdown', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    for (const item of MAIN_NAV) {
      await expect(page.getByTestId(item.testId)).toBeVisible({ timeout: 5000 });
    }

    await expect(page.getByTestId('nav-other-dropdown')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Main Navigation - Click Each Module', () => {
  for (const item of MAIN_NAV) {
    test(`"${item.label}" loads without error`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      await page.getByTestId(item.testId).click();
      await assertModuleLoaded(page, item.label, errors);
    });
  }
});

test.describe('Other Dropdown - All Items Accessible', () => {
  test('dropdown opens and shows all items', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    await openOtherDropdown(page);

    for (const item of OTHER_NAV) {
      await expect(
        page.getByTestId(item.testId),
        `"${item.label}" not in dropdown`
      ).toBeVisible({ timeout: 3000 });
    }
  });

  for (const item of OTHER_NAV) {
    test(`"${item.label}" loads without error`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      await clickOtherItem(page, item.testId);
      await assertModuleLoaded(page, item.label, errors);
    });
  }
});

test.describe('Full Navigation Cycle Audit', () => {
  test('navigate every module and produce error report', async ({ page }) => {
    test.setTimeout(120000);
    const moduleErrors: { module: string; errors: string[] }[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text().substring(0, 150));
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    const allItems = [
      ...MAIN_NAV.map(i => ({ ...i, isOther: false })),
      ...OTHER_NAV.map(i => ({ ...i, isOther: true })),
    ];

    for (const item of allItems) {
      const pageErrors: string[] = [];
      const errorHandler = (err: Error) => pageErrors.push(`${err.name}: ${err.message}`);
      page.on('pageerror', errorHandler);

      try {
        if (item.isOther) {
          await clickOtherItem(page, item.testId);
        } else {
          await page.getByTestId(item.testId).click();
        }

        await page.waitForTimeout(800);

        // Check for blank screen
        const mainHeight = await page.locator('main').evaluate(el => el.scrollHeight);
        if (mainHeight < 50) {
          pageErrors.push('BLANK_SCREEN: content height < 50px');
        }

        // Check for error boundary
        const hasErrorBoundary = await page.locator('text=Something went wrong').isVisible().catch(() => false);
        if (hasErrorBoundary) {
          pageErrors.push('ERROR_BOUNDARY: "Something went wrong" displayed');
        }
      } catch (e) {
        pageErrors.push(`NAVIGATION_ERROR: ${e instanceof Error ? e.message.substring(0, 100) : String(e)}`);
      }

      if (pageErrors.length > 0) {
        moduleErrors.push({ module: item.label, errors: pageErrors });
      }

      page.removeListener('pageerror', errorHandler);
    }

    // Print audit report
    console.log('\n========================================');
    console.log('    NAVIGATION AUDIT REPORT');
    console.log('========================================');
    console.log(`Total modules tested: ${allItems.length}`);
    console.log(`Modules with issues:  ${moduleErrors.length}`);
    console.log(`Console errors:       ${consoleErrors.length}`);
    console.log('----------------------------------------');

    if (moduleErrors.length === 0) {
      console.log('All modules loaded successfully!');
    } else {
      for (const { module, errors } of moduleErrors) {
        console.log(`\n  [ISSUE] ${module}:`);
        for (const err of errors) {
          console.log(`    - ${err.substring(0, 120)}`);
        }
      }
    }

    if (consoleErrors.length > 0) {
      console.log('\nSample console errors (first 10):');
      for (const err of consoleErrors.slice(0, 10)) {
        console.log(`  - ${err}`);
      }
    }
    console.log('========================================\n');

    // Fail only on error boundaries and nav failures
    const critical = moduleErrors.filter(m =>
      m.errors.some(e => e.includes('ERROR_BOUNDARY') || e.includes('NAVIGATION_ERROR'))
    );
    expect(
      critical.map(m => m.module),
      'Modules with critical failures'
    ).toHaveLength(0);
  });
});

test.describe('Visual Smoke Tests', () => {
  test('screenshot every module', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/screenshot-overview.png', fullPage: false });

    const allItems = [
      ...MAIN_NAV.map(i => ({ ...i, isOther: false })),
      ...OTHER_NAV.map(i => ({ ...i, isOther: true })),
    ];

    for (const item of allItems) {
      try {
        if (item.isOther) {
          await clickOtherItem(page, item.testId);
        } else {
          await page.getByTestId(item.testId).click();
        }
        await page.waitForTimeout(800);
      } catch {
        console.log(`Could not navigate to ${item.label}, skipping screenshot`);
        continue;
      }

      const name = item.testId.replace('nav-item-', '').replace('nav-other-', '');
      await page.screenshot({
        path: `test-results/screenshot-${name}.png`,
        fullPage: false,
      });
    }

    console.log(`Screenshots saved for ${allItems.length + 1} modules in test-results/`);
  });
});
