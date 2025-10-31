# Auto-Screenshot - Quick Start

## What It Does

Automatically opens your app, navigates through all 5 modules (Home, Ideas, Tinder, Tasker, Reflector), and captures screenshots of each one.

## Usage

### 1. Setup (One-time)

```bash
# Install Chromium
npx playwright install chromium

# Start your dev server
npm run dev
```

### 2. Take Screenshots

**Option A - Click the Button:**
- Open Blueprint view in your app
- Click the pink "Photo" button in the Test column
- Wait ~30 seconds for all 5 screenshots

**Option B - Use API:**
```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"executeAll": true}'
```

**Option C - Single Module:**
```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "ideas"}'
```

### 3. Find Your Screenshots

```
public/screenshots/
├── home/
│   └── home-module.png
├── ideas/
│   └── ideas-module.png
├── tinder/
│   └── tinder-module.png
├── tasker/
│   └── tasker-module.png
└── reflector/
    └── reflector-module.png
```

**Note:** Files have consistent names without timestamps. Each run **replaces** the previous screenshot.

View in browser:
```
http://localhost:3000/screenshots/ideas/ideas-module.png
```

## What Each Scenario Does

All scenarios follow the same pattern:

1. Navigate to `http://localhost:3000`
2. Wait 2.5 seconds for page to load
3. Click the TopBar navigation button (Home/Ideas/Tinder/Tasker/Reflector)
4. Wait 2 seconds for module to render
5. Capture full-page screenshot

## Customization

Edit `src/app/api/tester/scenarios.ts` to:
- Add new scenarios
- Modify delays
- Change navigation paths
- Add more complex interactions

Example:
```typescript
myCustom: {
  id: 'myCustom',
  name: 'My Custom Flow',
  description: 'Tests specific feature',
  baseUrl: 'http://localhost:3000',
  actions: [
    { type: 'navigate', url: 'http://localhost:3000' },
    { type: 'wait', delay: 2500 },
    { type: 'click', selector: 'button:has-text("Ideas")' },
    { type: 'wait', delay: 2000 },
    { type: 'click', selector: '#some-other-button' },
    { type: 'wait', delay: 1000 },
  ],
  screenshotName: 'my-custom-flow',
}
```

## Troubleshooting

**"Browser not found"**
```bash
npx playwright install chromium
```

**"Connection refused"**
- Make sure dev server is running: `npm run dev`
- Check it's on port 3000

**Screenshots are blank**
- Increase delay times in scenarios
- Check browser console for errors

**Selectors not working**
- Use Playwright's text selectors: `button:has-text("Text")`
- Inspect your UI to find correct selectors

## Optional: Browserbase

For production or remote testing:

1. Sign up at https://www.browserbase.com/
2. Add to `.env.local`:
   ```
   BROWSERBASE_API_KEY=your_key_here
   ```
3. Run same commands - now uses remote browser!

## That's It!

You're ready to automatically capture screenshots of your entire app. 📸

For more details, see:
- `README.md` - Full documentation
- `SETUP.md` - Detailed setup guide
