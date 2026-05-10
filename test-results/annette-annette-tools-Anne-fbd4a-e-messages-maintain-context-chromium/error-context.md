# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: annette\annette-tools.spec.ts >> Annette Tool Integration >> conversation flow — multiple messages maintain context
- Location: e2e\annette\annette-tools.spec.ts:156:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Which ones are still open?')
Expected: visible
Error: strict mode violation: locator('text=Which ones are still open?') resolved to 2 elements:
    1) <div class="whitespace-pre-wrap break-words">Which ones are still open?</div> aka getByLabel('Chat messages').getByText('Which ones are still open?')
    2) <button class="mt-2 w-full text-left px-2.5 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors truncate">Which ones are still open?</button> aka getByRole('button', { name: 'Which ones are still open?' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Which ones are still open?')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e18]:
    - banner [ref=e19]:
      - navigation [ref=e21]:
        - generic [ref=e22]:
          - button "Mini" [ref=e24]: Mini
          - button "Project" [ref=e28]: Project
          - button "Contexts" [ref=e32]: Contexts
          - button "Ideas" [ref=e36]: Ideas
          - button "Tinder" [ref=e40]: Tinder
          - button "Tasker" [ref=e44]: Tasker
          - button "Other" [ref=e48]:
            - generic [ref=e49]: Other
            - img [ref=e50]
          - 'status "Database status: pass" [ref=e56]'
    - main [ref=e59]:
      - generic [ref=e63]:
        - generic [ref=e65]:
          - generic [ref=e67]:
            - generic [ref=e68]:
              - img [ref=e70]
              - generic [ref=e73]:
                - heading "Annette" [level=2] [ref=e74]
                - paragraph [ref=e75]: Brain-powered AI assistant
            - generic [ref=e76]:
              - button "Enable audio responses" [ref=e77]:
                - img [ref=e78]
              - button "Mute notifications" [ref=e82]:
                - img [ref=e83]
              - button "Clear chat" [ref=e86]:
                - img [ref=e87]
          - tablist "Commander panels" [ref=e91]:
            - tab "Annette" [selected] [ref=e92]:
              - img [ref=e93]
              - text: Annette
            - tab "Voice Lab" [ref=e96]:
              - img [ref=e97]
              - text: Voice Lab
            - tab "Companion" [ref=e99]:
              - img [ref=e100]
              - text: Companion
            - tab "Agent" [ref=e103]:
              - img [ref=e104]
              - text: Agent
          - tabpanel "Annette" [ref=e107]:
            - generic [ref=e108]:
              - log "Chat messages" [ref=e109]:
                - generic [ref=e110]:
                  - generic [ref=e114]: How many goals does this project have?
                  - img [ref=e116]
                - generic [ref=e119]:
                  - img [ref=e121]
                  - generic [ref=e124]:
                    - generic [ref=e127]:
                      - paragraph [ref=e128]:
                        - text: The project has
                        - strong [ref=e129]: 87 goals
                        - text: ":"
                      - paragraph [ref=e130]: "| Status | Count | |--------|-------| | Done | 31 | | Open | 24 | | In Progress | 17 | | Undecided | 15 |"
                      - paragraph [ref=e131]: 31 completed is solid progress. But 17 in-progress simultaneously for a solo dev tool is more of a wishlist than focused work. The 15 undecided are mostly auto-generated candidates never triaged.
                    - generic [ref=e132]:
                      - button "Bash" [ref=e133] [cursor=pointer]:
                        - img [ref=e134]
                        - generic [ref=e136]: Bash
                        - img [ref=e137]
                      - button "All Tools" [ref=e140] [cursor=pointer]:
                        - img [ref=e141]
                        - generic [ref=e144]: All Tools
                    - paragraph [ref=e145]: 0 tokens
                - generic [ref=e146]:
                  - generic [ref=e150]: Which ones are still open?
                  - img [ref=e152]
                - status "Annette is thinking" [ref=e155]:
                  - img [ref=e156]
                  - generic [ref=e158]: Thinking...
                - status [ref=e159]: Annette is thinking
              - button "Toggle context details" [ref=e161]:
                - img [ref=e162]
                - generic [ref=e171]: No context loaded
                - img [ref=e173]
              - generic [ref=e176]:
                - textbox "Ask Annette..." [disabled] [ref=e177]
                - button "Start voice companion" [ref=e178]:
                  - img [ref=e179]
                - button "Send message" [disabled] [ref=e182]:
                  - img [ref=e183]
        - generic [ref=e187]:
          - generic [ref=e188]:
            - heading "Decisions" [level=3] [ref=e189]
            - generic [ref=e190]: "1"
          - generic [ref=e193]:
            - img [ref=e194]
            - generic [ref=e196]:
              - generic [ref=e198]: Suggested Next Step
              - paragraph [ref=e200]: "The project has **87 goals**: | Status | Count | |--------|-------| | Done | 31 | | Open | 24 | | In Progress | 17 | | ..."
              - button "Which ones are still open?" [ref=e201]
              - generic [ref=e202]:
                - button "Accept action" [ref=e203]:
                  - img [ref=e204]
                - button "Dismiss notification" [ref=e206]:
                  - img [ref=e207]
                - button "Snooze for 30 minutes" [ref=e210]:
                  - img [ref=e211]
      - region "Notifications alt+T"
  - generic [ref=e215]:
    - generic [ref=e216]:
      - button "Blueprint ^B" [ref=e217]:
        - img [ref=e218]
        - generic [ref=e220]: Blueprint
        - generic [ref=e221]: ^B
      - button "Workspace" [ref=e223]:
        - img [ref=e224]
        - generic [ref=e228]: Workspace
    - generic [ref=e229]:
      - button "All" [ref=e230]
      - button "auto-invoicer" [ref=e231]
      - button "hivecomp" [ref=e232]
      - button "personas" [ref=e233]
      - button "personas-cloud" [ref=e234]
      - button "personas-web" [ref=e235]
      - button "pof" [ref=e236]
      - button "studio-story" [ref=e237]
      - button "vibeman" [ref=e238]
    - generic [ref=e239]:
      - generic [ref=e240]: "781"
      - generic [ref=e241]: "1220"
      - generic [ref=e242]: "2166"
  - button "Open Next.js Dev Tools" [ref=e248] [cursor=pointer]:
    - img [ref=e249]
  - alert [ref=e252]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Annette Tool Integration E2E Tests
  5   |  *
  6   |  * Tests sending tool-oriented messages to Annette and verifying
  7   |  * the chat processes them (user message appears, response or error follows).
  8   |  * Uses "Vibeman" project for realistic data.
  9   |  */
  10  | 
  11  | const PROJECT_NAME = 'Vibeman';
  12  | 
  13  | async function selectProjectAndOpenAnnette(page: Page) {
  14  |   await page.goto('/', { waitUntil: 'networkidle' });
  15  |   await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  16  |   await page.waitForTimeout(2000);
  17  | 
  18  |   // Select Vibeman project
  19  |   const projectButton = page.locator(`button:has-text("${PROJECT_NAME}")`).first();
  20  |   await projectButton.waitFor({ state: 'attached', timeout: 10000 });
  21  |   await projectButton.click({ force: true });
  22  |   await page.waitForTimeout(1000);
  23  | 
  24  |   // Open Other dropdown -> Annette
  25  |   const dropdown = page.getByTestId('nav-other-dropdown');
  26  |   await dropdown.waitFor({ state: 'attached', timeout: 10000 });
  27  |   await dropdown.click({ force: true });
  28  |   await page.waitForTimeout(500);
  29  |   const annetteItem = page.getByTestId('nav-other-commander');
  30  |   await annetteItem.waitFor({ state: 'attached', timeout: 5000 });
  31  |   await annetteItem.click({ force: true });
  32  |   await page.waitForTimeout(1000);
  33  | }
  34  | 
  35  | async function waitForChatReady(page: Page) {
  36  |   await expect(
  37  |     page.locator('input[placeholder="Ask Annette..."]')
  38  |   ).toBeVisible({ timeout: 10000 });
  39  | }
  40  | 
  41  | /** Send a message and wait for it to appear in the chat */
  42  | async function sendMessage(page: Page, text: string) {
  43  |   const chatInput = page.locator('input[placeholder="Ask Annette..."]');
  44  |   const sendButton = page.locator('button[aria-label="Send message"]');
  45  | 
  46  |   // Wait for input to be enabled (not processing a previous message)
  47  |   await expect(chatInput).toBeEnabled({ timeout: 120000 });
  48  | 
  49  |   await chatInput.fill(text);
  50  |   await sendButton.click();
> 51  |   await expect(page.locator(`text=${text}`)).toBeVisible({ timeout: 5000 });
      |                                              ^ Error: expect(locator).toBeVisible() failed
  52  | }
  53  | 
  54  | /** Wait for an assistant response (any new content after user message) */
  55  | async function waitForResponse(page: Page, timeoutMs = 90000): Promise<boolean> {
  56  |   // Look for loading/thinking indicator to appear and then disappear
  57  |   // Or look for new assistant message content
  58  |   try {
  59  |     // Wait for input to become re-enabled (means processing finished)
  60  |     const chatInput = page.locator('input[placeholder="Ask Annette..."]');
  61  |     await expect(chatInput).toBeEnabled({ timeout: timeoutMs });
  62  |     return true;
  63  |   } catch {
  64  |     return false;
  65  |   }
  66  | }
  67  | 
  68  | // ─── Tool Integration Tests ────────────────────────────────────────
  69  | 
  70  | test.describe('Annette Tool Integration', () => {
  71  |   test.beforeEach(async ({ page }) => {
  72  |     test.setTimeout(120000);
  73  |     await selectProjectAndOpenAnnette(page);
  74  |     await waitForChatReady(page);
  75  |   });
  76  | 
  77  |   test('scan agents — ask to list available scan types', async ({ page }) => {
  78  |     await sendMessage(page, 'What scan agents are available?');
  79  | 
  80  |     const gotResponse = await waitForResponse(page);
  81  |     await page.screenshot({ path: 'test-results/annette-scan-agents.png' });
  82  | 
  83  |     // User message should be visible regardless
  84  |     await expect(page.locator('text=What scan agents are available?')).toBeVisible();
  85  | 
  86  |     if (gotResponse) {
  87  |       console.log('Got response for scan agents query');
  88  |     }
  89  |   });
  90  | 
  91  |   test('triage — ask about pending items to review', async ({ page }) => {
  92  |     await sendMessage(page, 'How many pending ideas need triage?');
  93  | 
  94  |     const gotResponse = await waitForResponse(page);
  95  |     await page.screenshot({ path: 'test-results/annette-triage.png' });
  96  | 
  97  |     await expect(page.locator('text=How many pending ideas need triage?')).toBeVisible();
  98  | 
  99  |     if (gotResponse) {
  100 |       console.log('Got response for triage query');
  101 |     }
  102 |   });
  103 | 
  104 |   test('project health — ask for honest assessment', async ({ page }) => {
  105 |     await sendMessage(page, 'Give me an honest assessment of this project health');
  106 | 
  107 |     const gotResponse = await waitForResponse(page);
  108 |     await page.screenshot({ path: 'test-results/annette-health.png' });
  109 | 
  110 |     await expect(page.locator('text=Give me an honest assessment')).toBeVisible();
  111 | 
  112 |     if (gotResponse) {
  113 |       console.log('Got response for project health query');
  114 |     }
  115 |   });
  116 | 
  117 |   test('brain insights — ask what brain has learned', async ({ page }) => {
  118 |     await sendMessage(page, 'What has the brain learned about this project?');
  119 | 
  120 |     const gotResponse = await waitForResponse(page);
  121 |     await page.screenshot({ path: 'test-results/annette-brain.png' });
  122 | 
  123 |     await expect(page.locator('text=What has the brain learned')).toBeVisible();
  124 | 
  125 |     if (gotResponse) {
  126 |       console.log('Got response for brain insights query');
  127 |     }
  128 |   });
  129 | 
  130 |   test('task runner — ask about running tasks', async ({ page }) => {
  131 |     await sendMessage(page, 'Are there any active tasks running?');
  132 | 
  133 |     const gotResponse = await waitForResponse(page);
  134 |     await page.screenshot({ path: 'test-results/annette-tasks.png' });
  135 | 
  136 |     await expect(page.locator('text=Are there any active tasks running?')).toBeVisible();
  137 | 
  138 |     if (gotResponse) {
  139 |       console.log('Got response for task runner query');
  140 |     }
  141 |   });
  142 | 
  143 |   test('codebase analysis — ask about project structure', async ({ page }) => {
  144 |     await sendMessage(page, 'Analyze the codebase structure of this project');
  145 | 
  146 |     const gotResponse = await waitForResponse(page);
  147 |     await page.screenshot({ path: 'test-results/annette-codebase.png' });
  148 | 
  149 |     await expect(page.locator('text=Analyze the codebase structure')).toBeVisible();
  150 | 
  151 |     if (gotResponse) {
```