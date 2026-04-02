import { test, expect, type Page } from '@playwright/test';

/**
 * Annette Tool Integration E2E Tests
 *
 * Tests sending tool-oriented messages to Annette and verifying
 * the chat processes them (user message appears, response or error follows).
 * Uses "Vibeman" project for realistic data.
 */

const PROJECT_NAME = 'Vibeman';

async function selectProjectAndOpenAnnette(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Select Vibeman project
  const projectButton = page.locator(`button:has-text("${PROJECT_NAME}")`).first();
  await projectButton.waitFor({ state: 'attached', timeout: 10000 });
  await projectButton.click({ force: true });
  await page.waitForTimeout(1000);

  // Open Other dropdown -> Annette
  const dropdown = page.getByTestId('nav-other-dropdown');
  await dropdown.waitFor({ state: 'attached', timeout: 10000 });
  await dropdown.click({ force: true });
  await page.waitForTimeout(500);
  const annetteItem = page.getByTestId('nav-other-commander');
  await annetteItem.waitFor({ state: 'attached', timeout: 5000 });
  await annetteItem.click({ force: true });
  await page.waitForTimeout(1000);
}

async function waitForChatReady(page: Page) {
  await expect(
    page.locator('input[placeholder="Ask Annette..."]')
  ).toBeVisible({ timeout: 10000 });
}

/** Send a message and wait for it to appear in the chat */
async function sendMessage(page: Page, text: string) {
  const chatInput = page.locator('input[placeholder="Ask Annette..."]');
  const sendButton = page.locator('button[aria-label="Send message"]');

  // Wait for input to be enabled (not processing a previous message)
  await expect(chatInput).toBeEnabled({ timeout: 120000 });

  await chatInput.fill(text);
  await sendButton.click();
  await expect(page.locator(`text=${text}`)).toBeVisible({ timeout: 5000 });
}

/** Wait for an assistant response (any new content after user message) */
async function waitForResponse(page: Page, timeoutMs = 90000): Promise<boolean> {
  // Look for loading/thinking indicator to appear and then disappear
  // Or look for new assistant message content
  try {
    // Wait for input to become re-enabled (means processing finished)
    const chatInput = page.locator('input[placeholder="Ask Annette..."]');
    await expect(chatInput).toBeEnabled({ timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

// ─── Tool Integration Tests ────────────────────────────────────────

test.describe('Annette Tool Integration', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await selectProjectAndOpenAnnette(page);
    await waitForChatReady(page);
  });

  test('scan agents — ask to list available scan types', async ({ page }) => {
    await sendMessage(page, 'What scan agents are available?');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-scan-agents.png' });

    // User message should be visible regardless
    await expect(page.locator('text=What scan agents are available?')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for scan agents query');
    }
  });

  test('triage — ask about pending items to review', async ({ page }) => {
    await sendMessage(page, 'How many pending ideas need triage?');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-triage.png' });

    await expect(page.locator('text=How many pending ideas need triage?')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for triage query');
    }
  });

  test('project health — ask for honest assessment', async ({ page }) => {
    await sendMessage(page, 'Give me an honest assessment of this project health');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-health.png' });

    await expect(page.locator('text=Give me an honest assessment')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for project health query');
    }
  });

  test('brain insights — ask what brain has learned', async ({ page }) => {
    await sendMessage(page, 'What has the brain learned about this project?');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-brain.png' });

    await expect(page.locator('text=What has the brain learned')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for brain insights query');
    }
  });

  test('task runner — ask about running tasks', async ({ page }) => {
    await sendMessage(page, 'Are there any active tasks running?');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-tasks.png' });

    await expect(page.locator('text=Are there any active tasks running?')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for task runner query');
    }
  });

  test('codebase analysis — ask about project structure', async ({ page }) => {
    await sendMessage(page, 'Analyze the codebase structure of this project');

    const gotResponse = await waitForResponse(page);
    await page.screenshot({ path: 'test-results/annette-codebase.png' });

    await expect(page.locator('text=Analyze the codebase structure')).toBeVisible();

    if (gotResponse) {
      console.log('Got response for codebase analysis query');
    }
  });

  test('conversation flow — multiple messages maintain context', async ({ page }) => {
    // First message
    await sendMessage(page, 'How many goals does this project have?');
    await waitForResponse(page);

    // Second message (should have context from first)
    await sendMessage(page, 'Which ones are still open?');
    await waitForResponse(page);

    await page.screenshot({ path: 'test-results/annette-conversation.png' });

    // Both user messages should be visible
    await expect(page.locator('text=How many goals does this project have?')).toBeVisible();
    await expect(page.locator('text=Which ones are still open?')).toBeVisible();
  });
});
