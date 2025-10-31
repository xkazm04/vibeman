# Auto-Screenshot Feature - Quick Setup Guide

## Prerequisites

- Node.js and npm installed
- Next.js dev server running on port 3000
- playwright-core package installed (✓ Already installed)

## Quick Start (Local Mode - No Browserbase Required)

1. **Install Chromium for Playwright**
   ```bash
   npx playwright install chromium
   ```

2. **Start your dev server**
   ```bash
   npm run dev
   ```

3. **Test the screenshot feature**

   Option A - Via UI:
   - Navigate to your app at http://localhost:3000
   - Open the Blueprint view
   - Click the "Photo" button in the Test column
   - This will capture all 5 modules (Home, Ideas, Tinder, Tasker, Reflector)
   - Check `public/screenshots/<module-name>/` for screenshots

   Option B - Via API (single module):
   ```bash
   curl -X POST http://localhost:3000/api/tester/screenshot \
     -H "Content-Type: application/json" \
     -d '{"scenarioId": "ideas"}'
   ```

   Option C - Via API (all modules):
   ```bash
   curl -X POST http://localhost:3000/api/tester/screenshot \
     -H "Content-Type: application/json" \
     -d '{"executeAll": true}'
   ```

4. **View screenshots**
   - Screenshots are saved to: `public/screenshots/<scenarioId>/`
   - Example: `public/screenshots/ideas/ideas-module.png`
   - Access via browser: `http://localhost:3000/screenshots/ideas/ideas-module.png`
   - **Note:** Each run replaces the previous screenshot (no timestamps)

## Optional: Browserbase Setup (Recommended for Production)

Browserbase provides remote browser execution without needing to manage browser binaries locally.

1. **Sign up for Browserbase**
   - Visit https://www.browserbase.com/
   - Create an account and get your API key

2. **Add credentials to .env.local**
   ```env
   BROWSERBASE_API_KEY=your_actual_api_key_here
   BROWSERBASE_PROJECT_ID=your_project_id  # Optional
   ```

3. **Test Browserbase connection**
   ```bash
   curl -X POST http://localhost:3000/api/tester/screenshot \
     -H "Content-Type: application/json" \
     -d '{"scenarioId": "default"}'
   ```

## Available Test Scenarios

The following scenarios are pre-configured (navigate via TopBar):

- `home` - Home (Coder) module
- `ideas` - Ideas module
- `tinder` - Tinder module
- `tasker` - Tasker module
- `reflector` - Reflector module

Each scenario:
1. Opens localhost:3000
2. Waits for page to load
3. Clicks the navigation button in TopBar
4. Waits for module to render
5. Captures full-page screenshot

To run a specific scenario:
```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "ideas"}'
```

To run all 5 scenarios:
```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"executeAll": true}'
```

**Note**: The "Photo" button in Blueprint UI runs all 5 scenarios automatically.

## Customizing Scenarios

Edit `src/app/api/tester/scenarios.ts` to add your own test scenarios:

```typescript
myCustomTest: {
  id: 'myCustomTest',
  name: 'My Custom Test',
  description: 'Tests my feature',
  baseUrl: 'http://localhost:3000',
  actions: [
    { type: 'navigate', url: 'http://localhost:3000' },
    { type: 'wait', delay: 2000 },
    { type: 'click', selector: '#my-button-id' },
    { type: 'wait', delay: 1000 },
  ],
  screenshotName: 'my-custom-test',
}
```

## Troubleshooting

### "Browser executable not found"
- Run: `npx playwright install chromium`
- Or configure Browserbase (see above)

### Screenshots not appearing
- Check that dev server is running on port 3000
- Verify `public/screenshots/` directory exists
- Check console logs for error messages

### Selectors not working
- Inspect your app to find the correct element IDs
- Update selectors in `scenarios.ts`
- Add longer wait times if needed

### Connection timeout
- Increase wait delays in scenarios
- Check network connectivity
- Verify dev server is accessible

## Next Steps

1. ✅ Feature is ready to use!
2. Customize scenarios for your specific UI flows
3. Integrate with CI/CD for automated testing
4. Consider adding visual regression testing
5. Explore AI-powered testing enhancements

## File Structure

```
src/app/api/tester/
├── README.md                    # Full documentation
├── SETUP.md                     # This file
├── scenarios.ts                 # Test scenario definitions
├── screenshot/
│   └── route.ts                # API endpoint
└── lib/
    ├── browserbase.ts          # Browserbase integration
    └── screenshotExecutor.ts   # Execution logic

public/screenshots/              # Screenshot output directory
  └── <scenarioId>/
      └── <filename>.png

src/app/features/Onboarding/sub_Blueprint/
├── DarkBlueprintLayout.tsx     # UI integration (Photo button)
├── lib/
│   └── blueprintConfig.ts      # Button configurations
└── components/
    ├── BlueprintColumn.tsx     # Reusable column component
    ├── BlueprintBackground.tsx # Background component
    └── BlueprintCornerLabels.tsx
```

## Support

For issues or questions:
- Check the full README.md in this directory
- Review API response messages for debugging hints
- Check browser console and server logs
- Ensure all prerequisites are met

Happy testing! 📸
