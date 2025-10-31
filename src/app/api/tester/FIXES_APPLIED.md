# Screenshot Feature - Fixes Applied for Timeout Issue

## 🎯 Problem

Navigation timeout when trying to access `localhost:3000`:
```
Error [TimeoutError]: page.goto: Timeout 30000ms exceeded.
navigating to "http://localhost:3000/", waiting until "domcontentloaded"
```

This means the browser **cannot connect** to localhost at all (not a wait condition issue).

---

## ✅ Fixes Applied

### 1. **Force Local Browser for Localhost** ⭐ CRITICAL FIX

**Problem:** If Browserbase is configured, it tries to use a remote browser which **cannot access your local machine**.

**Solution:**
- Auto-detect localhost URLs
- Force local Playwright browser for localhost testing
- Only use Browserbase for public URLs

**Location:** `src/app/api/tester/lib/browserbase.ts:75`

```typescript
export async function connectToBrowser(forceLocal: boolean = false) {
  if (forceLocal) {
    console.log('[Browser] Using local browser (forced for localhost testing)');
    return await connectToLocalBrowser();
  }
  // ... rest of logic
}
```

**Location:** `src/app/api/tester/screenshot/route.ts:97`

```typescript
const usesLocalhost = scenariosToCheck.some((s) => isLocalhostUrl(s.baseUrl));
browser = await connectToBrowser(usesLocalhost); // Force local if localhost
```

---

### 2. **Server Accessibility Pre-Check** ⭐ CRITICAL FIX

**Problem:** Browser wastes 30 seconds trying to connect before failing.

**Solution:**
- Check if server is accessible BEFORE launching browser
- Fail fast with helpful error message
- 5-second timeout for quick feedback

**Location:** `src/app/api/tester/screenshot/route.ts:36`

```typescript
async function checkServerAccessibility(url: string): Promise<void> {
  const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
  if (!response.ok) {
    throw new Error('Server not accessible. Is your dev server running?');
  }
}
```

---

### 3. **Better Browser Launch Args**

**Problem:** Windows/localhost compatibility issues.

**Solution:**
- Added browser args to disable security features for local testing
- Helps with localhost connections on Windows

**Location:** `src/app/api/tester/lib/browserbase.ts:67`

```typescript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
  ],
});
```

---

### 4. **Enhanced Error Logging**

**Problem:** Hard to debug what's going wrong.

**Solution:**
- Added detailed logging at each step
- Browser console/error listeners
- Request failure tracking

**Location:** `src/app/api/tester/lib/screenshotExecutor.ts:104-117`

```typescript
page.on('console', (msg) => console.log(`[Browser ${msg.type()}]`, msg.text()));
page.on('pageerror', (error) => console.error('[Browser Page Error]', error));
page.on('requestfailed', (req) => console.error('[Request Failed]', req.url()));
```

---

### 5. **Chromium Installation Check**

**Problem:** Unclear error if Chromium not installed.

**Solution:**
- Detect missing Chromium
- Provide clear installation instructions

**Location:** `src/app/api/tester/lib/browserbase.ts:80`

```typescript
catch (error) {
  if (error.message.includes('Executable doesn\'t exist')) {
    throw new Error('Chromium not found. Run: npx playwright install chromium');
  }
}
```

---

### 6. **Diagnostic Endpoint**

**NEW:** Quick system check to verify setup.

**Usage:**
```bash
curl http://localhost:3000/api/tester/diagnostic
```

**Checks:**
- ✅ Dev server accessible
- ✅ Chromium installed
- ✅ Browserbase config
- ✅ Screenshot directory
- ✅ Scenarios loaded

**Location:** `src/app/api/tester/diagnostic/route.ts`

---

## 🔧 How to Diagnose Your Issue

### Step 1: Run Diagnostic

```bash
curl http://localhost:3000/api/tester/diagnostic
```

This will tell you exactly what's wrong.

### Step 2: Check Dev Server

```bash
# Test if server responds
curl http://localhost:3000

# Should return HTML, not connection error
```

### Step 3: Verify Chromium

```bash
npx playwright install chromium
```

### Step 4: Try Screenshot

```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "home"}'
```

### Step 5: Read the Logs

Look for these indicators:

**✅ Good logs:**
```
[Screenshot API] Checking server accessibility: http://localhost:3000
[Screenshot API] ✅ Server is accessible
[Browser] Using local browser (forced for localhost testing)
[Browser] ✅ Local browser launched successfully
[Executor] Target URL: http://localhost:3000
[Executor] Executing action: navigate (url: http://localhost:3000)
[Executor] Navigation complete
```

**❌ Problem logs:**
```
Cannot connect to http://localhost:3000
Server not accessible
Chromium not found
```

---

## 📋 Checklist Before Running

- [ ] Dev server is running (`npm run dev`)
- [ ] Server responds to `curl http://localhost:3000`
- [ ] Chromium is installed (`npx playwright install chromium`)
- [ ] Diagnostic endpoint shows all green
- [ ] No BROWSERBASE_API_KEY in .env (or understanding it will use local browser for localhost)

---

## 🎯 Expected Behavior Now

1. **Pre-check:** API verifies server is accessible (< 5 seconds)
2. **Browser:** Launches LOCAL Chromium browser (not Browserbase)
3. **Navigate:** Opens localhost:3000 quickly
4. **Click:** Finds TopBar buttons and clicks them
5. **Screenshot:** Captures full page
6. **Complete:** All 5 scenarios in ~25-30 seconds

---

## 🆘 If Still Failing

### Check Your Dev Server Port

Your server might not be on port 3000:

```bash
# Find what port your server is actually on
netstat -ano | findstr :3000

# Update scenarios.ts if needed
baseUrl: 'http://localhost:ACTUAL_PORT'
```

### Check Chromium Explicitly

```bash
# Test Chromium directly
node -e "require('playwright-core').chromium.launch().then(b => { console.log('✅ Chromium OK'); b.close(); })"
```

### Enable Debug Mode

Add to `.env.local`:
```env
DEBUG=pw:api
```

### Try Manually in Browser

1. Open http://localhost:3000 in your regular browser
2. Verify the page loads
3. Verify TopBar buttons are visible
4. Verify you can click them manually

If manual testing works but automated doesn't, it's likely:
- Timing issues (increase waits in scenarios)
- Selector issues (verify button text matches exactly)
- Browser permissions (run as administrator)

---

## 📞 Next Steps

1. **Run diagnostic:** `curl http://localhost:3000/api/tester/diagnostic`
2. **Fix any critical issues** it reports
3. **Try screenshot again**
4. **Check logs** for detailed error messages
5. **Refer to TROUBLESHOOTING.md** for specific issues

The fixes should resolve the localhost connection timeout. If you're still having issues, the diagnostic endpoint will tell you exactly what's wrong!

---

## 📸 Screenshot File Naming

Screenshots use **consistent filenames** without timestamps:

```
public/screenshots/
├── home/home-module.png
├── ideas/ideas-module.png
├── tinder/tinder-module.png
├── tasker/tasker-module.png
└── reflector/reflector-module.png
```

**Benefits:**
- ✅ Always have the latest screenshot
- ✅ No file accumulation over time
- ✅ Easy to reference with static URLs
- ✅ Perfect for CI/CD pipelines
- ✅ Each run automatically replaces previous screenshots

Access your screenshots at:
```
http://localhost:3000/screenshots/ideas/ideas-module.png
```
