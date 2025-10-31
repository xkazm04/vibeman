# Screenshot Feature - Troubleshooting Guide

## 🔍 Quick Diagnostic

Run this first to check your setup:
```bash
curl http://localhost:3000/api/tester/diagnostic
```

This will check:
- ✅ Dev server is running and accessible
- ✅ Chromium browser is installed
- ✅ Screenshot directory exists
- ✅ Scenarios are loaded correctly

---

## Common Issues and Solutions

### ⚠️ Navigation Timeout - Cannot Connect to localhost

**Error:**
```
Error [TimeoutError]: page.goto: Timeout 30000ms exceeded.
navigating to "http://localhost:3000/", waiting until "domcontentloaded"
```

**Root Cause:**
The browser cannot connect to localhost:3000 at all. This happens when:

1. **Dev server is not running** ❌
   ```bash
   # Check if server is running
   curl http://localhost:3000

   # If it fails, start it
   npm run dev
   ```

2. **Using Browserbase for localhost URLs** ❌
   - Remote browsers can't access your local machine
   - **FIX APPLIED:** Now automatically uses local browser for localhost

3. **Chromium not installed** ❌
   ```bash
   npx playwright install chromium
   ```

4. **Port conflict** ❌
   - Your dev server might be on a different port
   - Check what port it's actually running on
   - Update scenarios.ts if needed

**Verification Steps:**

1. **Verify dev server is accessible:**
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

2. **Run diagnostic endpoint:**
   ```bash
   curl http://localhost:3000/api/tester/diagnostic
   ```

3. **Check the logs for:**
   ```
   [Screenshot API] Checking server accessibility: http://localhost:3000
   [Screenshot API] ✅ Server is accessible
   [Browser] Using local browser (forced for localhost testing)
   [Browser] ✅ Local browser launched successfully
   ```

**Solutions Applied:**
- ✅ Auto-detects localhost URLs and forces local browser
- ✅ Pre-checks server accessibility before launching browser
- ✅ Better error messages with actionable hints
- ✅ Added browser args for Windows localhost compatibility

---

### Click Selector Issues

**Problem:** Buttons not being found/clicked

**Solutions Applied:**
1. **Changed selector syntax:**
   - ❌ Old: `button:has-text("Home")`
   - ✅ New: `text=Home`

2. **Added wait before click:**
   - Now waits for element to be visible before clicking
   - 10 second timeout for element to appear

3. **Increased initial wait:**
   - Changed from 2.5s to 3.0s to allow animations to complete

**Location:** `src/app/api/tester/scenarios.ts`

---

## Current Configuration

### Navigation Settings
```typescript
await page.goto(url, {
  waitUntil: 'domcontentloaded',  // ✅ Works with Next.js dev server
  timeout: 30000                   // 30 second timeout
});
```

### Click Settings
```typescript
// Wait for element to appear
await page.waitForSelector(selector, {
  state: 'visible',
  timeout: 10000
});

// Then click
await page.click(selector);
```

### Timing Settings
- Initial page load wait: **3 seconds**
- Post-click wait: **2 seconds**
- Navigation timeout: **30 seconds**
- Element wait timeout: **10 seconds**

---

## Testing the Fix

### Quick Test (Single Scenario)
```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "home"}'
```

### Expected Console Output
```
[Screenshot API] Browser connected
[Screenshot API] Executing scenario: Home Module Screenshot
[Executor] Starting scenario: Home Module Screenshot
[Executor] Executing action: navigate (url: http://localhost:3000)
[Executor] Navigation complete
[Executor] Executing action: wait
[Executor] Executing action: click (selector: text=Home)
[Executor] Waiting for element: text=Home
[Executor] Element found, clicking...
[Executor] Click complete
[Executor] Executing action: wait
[Executor] Screenshot saved: [path]
[Screenshot API] Browser closed
```

---

## Still Having Issues?

### Dev Server Not Running
**Symptom:** Connection refused errors

**Check:**
```bash
curl http://localhost:3000
```

**Fix:**
```bash
npm run dev
```

---

### Browser Binary Not Found
**Symptom:** "Executable doesn't exist" or similar

**Fix:**
```bash
npx playwright install chromium
```

---

### Selectors Not Working
**Debug Steps:**

1. **Check if element exists:**
   - Open http://localhost:3000 in browser
   - Open DevTools (F12)
   - Try finding element manually

2. **Test selector in Playwright:**
   ```javascript
   // In browser console or Playwright inspector
   document.querySelector('text=Home')
   ```

3. **Alternative selectors to try:**
   ```typescript
   'text=Home'              // ✅ Current (exact text match)
   'button >> text=Home'    // Button containing text
   '[title*="Home"]'        // By title attribute
   'button:nth-of-type(1)'  // First button
   ```

---

### Screenshots Are Blank
**Possible causes:**
1. Module not loaded yet
2. Wait time too short
3. Page has errors

**Fix:**
1. Increase wait times in scenarios:
   ```typescript
   { type: 'wait', delay: 5000 }  // Increase from 2000 to 5000
   ```

2. Check browser console for errors:
   - Look at screenshot response for error messages
   - Check Next.js dev server logs

---

### Timeout on Specific Module
**Example:** Ideas module times out but others work

**Diagnosis:**
1. That module might have slower loading
2. Element selector might be different
3. Module might have errors

**Fix:**
1. Increase wait times for that specific scenario
2. Check module loads correctly in browser
3. Verify TopBar button text matches exactly

---

## Advanced Debugging

### Enable Playwright Debug Mode
Add to your `.env.local`:
```env
DEBUG=pw:api
```

### Capture Debug Screenshot
Modify scenario to add intermediate screenshots:
```typescript
actions: [
  { type: 'navigate', url: 'http://localhost:3000' },
  { type: 'wait', delay: 3000 },
  // Add screenshot here to see state before click
  { type: 'click', selector: 'text=Ideas' },
  { type: 'wait', delay: 2000 },
]
```

### Check Page Errors
Add to `screenshotExecutor.ts` in `executeScenario`:
```typescript
page.on('console', msg => console.log('[Browser]', msg.text()));
page.on('pageerror', error => console.error('[Browser Error]', error));
```

---

## Performance Tuning

### Reduce Wait Times (When Working Well)
If screenshots are working reliably, you can reduce waits:
```typescript
{ type: 'wait', delay: 1500 }  // From 3000
{ type: 'wait', delay: 1000 }  // From 2000
```

### Increase Timeout (For Slow Connections)
```typescript
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 60000  // Increase to 60 seconds
});
```

---

## When to Use Different waitUntil Options

### domcontentloaded ✅ (Current)
- **Use for:** Next.js dev server, SPAs with active connections
- **Waits for:** HTML parsed, DOM ready
- **Speed:** Fast (1-3 seconds)

### load
- **Use for:** Static sites, simple pages
- **Waits for:** All resources loaded (images, CSS, JS)
- **Speed:** Medium (3-5 seconds)

### networkidle ❌ (Don't use for dev)
- **Use for:** Production builds only
- **Waits for:** No network activity for 500ms
- **Speed:** Slow or never (times out with hot reload)

---

## Getting Help

If issues persist:

1. **Check the logs** in your console for detailed error messages
2. **Verify dev server** is running and accessible
3. **Test manually** - can you click the buttons in a real browser?
4. **Check timing** - try increasing wait delays
5. **Review selectors** - ensure they match your actual UI

## Success Indicators

You know it's working when you see:
- ✅ All 5 scenarios complete without errors
- ✅ Screenshots appear in `public/screenshots/*/`
- ✅ Each screenshot shows the correct module
- ✅ Total execution time is 20-30 seconds

Happy testing! 📸
