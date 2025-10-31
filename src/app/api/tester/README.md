# Auto-Screenshot Testing Feature

This feature provides automated browser testing and screenshot capture capabilities for your NextJS application using Browserbase and Playwright.

## Overview

The auto-screenshot feature allows you to:
- Define test scenarios with sequences of browser actions
- Capture screenshots of your application in different states
- Use Browserbase for remote browser execution (with local fallback)
- Store screenshots in organized folders by scenario

## Architecture

### Components

1. **Scenarios** (`scenarios.ts`)
   - Define test scenarios with browser actions
   - Each scenario has a unique ID, name, and action sequence
   - Actions include: navigate, click, wait, scroll, type

2. **Browserbase Integration** (`lib/browserbase.ts`)
   - Connects to Browserbase remote browsers
   - Falls back to local Playwright if Browserbase is not configured
   - Handles authentication and connection management

3. **Screenshot Executor** (`lib/screenshotExecutor.ts`)
   - Executes scenario actions in sequence
   - Captures full-page screenshots
   - Saves screenshots to `public/screenshots/<scenarioId>/`

4. **API Endpoint** (`screenshot/route.ts`)
   - POST `/api/tester/screenshot` - Execute scenarios
   - GET `/api/tester/screenshot` - List available scenarios

### UI Integration

- **Blueprint Layout**: A "Photo" button in the Test column triggers screenshots
- **Location**: `src/app/features/Onboarding/sub_Blueprint/DarkBlueprintLayout.tsx`
- **Config**: Button definitions in `sub_Blueprint/lib/blueprintConfig.ts`

## Setup

### 1. Install Dependencies

```bash
npm install playwright-core
```

### 2. Configure Browserbase (Optional)

Create a `.env.local` file with your Browserbase credentials:

```env
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here  # Optional
```

Get your API key from [Browserbase](https://www.browserbase.com/).

**Note**: If Browserbase is not configured, the system will automatically fall back to using a local Playwright browser.

### 3. Ensure Dev Server is Running

The scenarios assume your app is running on `http://localhost:3000`. Make sure your dev server is running before capturing screenshots.

```bash
npm run dev
```

## Usage

### Via UI

1. Navigate to the Blueprint view in your app
2. Click the "Photo" button in the Test column
3. Wait for all 5 scenarios to complete (Home, Ideas, Tinder, Tasker, Reflector)
4. Find screenshots in `public/screenshots/<scenarioId>/`
   - Example: `public/screenshots/ideas/ideas-module.png`
   - **Note:** Each run replaces the previous screenshot

### Via API

#### Execute Single Scenario

```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "ideas"}'
```

Available scenarios: `home`, `ideas`, `tinder`, `tasker`, `reflector`

#### Execute Multiple Scenarios

```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"scenarioIds": ["home", "ideas", "tinder"]}'
```

#### Execute All 5 Scenarios

```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"executeAll": true}'
```

This is what the "Photo" button does in the Blueprint UI.

#### List Available Scenarios

```bash
curl http://localhost:3000/api/tester/screenshot
```

## Pre-configured Scenarios

All 5 scenarios navigate through the TopBar navigation:

1. **home** - Navigates to Home (Coder) module
2. **ideas** - Navigates to Ideas module
3. **tinder** - Navigates to Tinder module
4. **tasker** - Navigates to Tasker module
5. **reflector** - Navigates to Reflector module

Each scenario:
- Opens `http://localhost:3000`
- Waits 2.5 seconds for page load
- Clicks the TopBar navigation button using `button:has-text("ModuleName")`
- Waits 2 seconds for module to render
- Captures full-page screenshot

## Creating Custom Scenarios

Edit `scenarios.ts` to add new test scenarios:

```typescript
export const TEST_SCENARIOS: Record<string, TestScenario> = {
  myCustomScenario: {
    id: 'myCustomScenario',
    name: 'My Custom Test',
    description: 'Tests a specific user flow',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 2500 },
      { type: 'click', selector: 'button:has-text("My Button")' },
      { type: 'wait', delay: 1500 },
      { type: 'type', selector: '#input-field', text: 'Hello World' },
      { type: 'scroll', scrollY: 500 },
    ],
    screenshotName: 'my-custom-test',
  },
};
```

**Tip**: Use Playwright's text selectors like `button:has-text("Text")` for more reliable element targeting.

### Available Actions

- **navigate**: Navigate to a URL
  - `url`: Target URL

- **click**: Click an element
  - `selector`: CSS selector for the element

- **wait**: Wait for a specified time
  - `delay`: Milliseconds to wait

- **type**: Type text into an input
  - `selector`: CSS selector for the input
  - `text`: Text to type

- **scroll**: Scroll to a position
  - `scrollY`: Vertical scroll position in pixels

## Screenshot Storage

Screenshots are stored with **consistent filenames** (no timestamps):
```
public/
  screenshots/
    <scenarioId>/
      <scenarioName>.png
```

Examples (one for each module):
```
public/screenshots/home/home-module.png
public/screenshots/ideas/ideas-module.png
public/screenshots/tinder/tinder-module.png
public/screenshots/tasker/tasker-module.png
public/screenshots/reflector/reflector-module.png
```

**Note:** Each run **replaces** the previous screenshot with the same name. This ensures you always have the latest version without accumulating old screenshots.

Access via browser:
```
http://localhost:3000/screenshots/ideas/ideas-module.png
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "results": [
    {
      "success": true,
      "screenshotPath": "/screenshots/home/home-module.png",
      "metadata": {
        "scenarioId": "home",
        "scenarioName": "Home Module Screenshot",
        "timestamp": "2025-01-15T10:30:45.000Z",
        "duration": 4521
      }
    },
    {
      "success": true,
      "screenshotPath": "/screenshots/ideas/ideas-module.png",
      "metadata": {
        "scenarioId": "ideas",
        "scenarioName": "Ideas Module Screenshot",
        "timestamp": "2025-01-15T10:32:12.000Z",
        "duration": 4735
      }
    }
    // ... 3 more results for tinder, tasker, reflector
  ]
}
```

### Error Response

```json
{
  "error": "Screenshot execution failed",
  "details": "Error message here"
}
```

## Troubleshooting

### Local Browser Issues

If you're not using Browserbase, ensure you have Chromium installed for Playwright:

```bash
npx playwright install chromium
```

### Connection Errors

- Verify your dev server is running on port 3000
- Check that selectors in scenarios match your actual UI elements
- Ensure sufficient timeout delays for page loads

### Browserbase Connection Issues

- Verify your API key is correct
- Check that your Browserbase account is active
- Review browser logs in your Browserbase dashboard

## Advanced Features

### LLM Provider Integration (Future)

The architecture is designed to support AI-powered testing with the existing `ProviderSelector` component. Future enhancements could include:
- Natural language test scenario generation
- AI-powered visual regression testing
- Automated bug detection using vision models

### Extending Scenarios

You can extend the scenario system with:
- Custom action types
- Conditional logic
- Data-driven scenarios
- Parallel execution

## Security Considerations

- Screenshots may contain sensitive data - review before sharing
- Browserbase API keys should be kept secure
- Screenshot directories are publicly accessible via the Next.js public folder
- Consider implementing authentication for the API endpoint in production

## Performance

- Screenshots are captured sequentially to avoid resource contention
- Full-page screenshots may take longer for long pages
- Browserbase provides distributed execution for parallel scenarios
- Maximum execution time is set to 60 seconds per request

## License

Part of the Vibeman project - see main project README for license information.
