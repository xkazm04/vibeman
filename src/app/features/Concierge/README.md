# AI Code Concierge Feature

## Overview

The AI Code Concierge is a low-friction natural-language interface that bridges the gap between business stakeholders and development teams. Non-technical users can request features in plain English, and Claude AI translates these requests into production-ready code, tests, and documentation.

## Architecture

### Database Layer

**Tables:**
- `feature_requests` - Main request tracking
- `feature_request_comments` - Discussion and collaboration
- `feature_request_notifications` - Email notification queue

**Location:** `src/app/db/`
- `models/feature-request.types.ts` - TypeScript types
- `repositories/feature-request.repository.ts` - CRUD operations
- `schema.ts` - Table definitions (updated)

### API Endpoints

**Location:** `src/app/api/concierge/`

1. **`/api/concierge/requests`** (GET, POST, PATCH, DELETE)
   - Create, read, update, delete feature requests
   - Query by project, status, or ID
   - Get request with comments

2. **`/api/concierge/generate`** (POST, GET)
   - Generate code from natural language
   - Check generation status
   - Returns AI analysis, code files, tests, documentation

3. **`/api/concierge/commit`** (POST)
   - Write generated code to disk
   - Optionally commit to Git
   - Returns commit SHA and URL

4. **`/api/concierge/webhook`** (POST, GET)
   - Accept requests from external tools
   - Supports Notion, Jira, Confluence, Slack
   - Webhook secret authentication

### Services

**Location:** `src/app/features/Concierge/lib/`

1. **`codeGenerator.ts`**
   - AI-powered code generation
   - Context loading from database
   - Code validation and quality checks
   - Generates complete file structures

2. **`notifications.ts`**
   - Developer notifications (new requests, code generated)
   - Requester notifications (committed, failed)
   - Email queue management
   - Event logging integration

### UI Components

**Location:** `src/app/features/Concierge/components/`

1. **`ConciergeInterface.tsx`**
   - Full-screen interface
   - Feature request form
   - Status tracking
   - Code review and approval
   - Recent requests history

2. **`ConciergeWidget.tsx`**
   - Floating widget with sparkle button
   - Minimize/maximize functionality
   - Embedded ConciergeInterface
   - Compact and unobtrusive

## Usage

### Embedding the Widget

```tsx
import ConciergeWidget from '@/app/features/Concierge/components/ConciergeWidget';

function MyApp() {
  return (
    <>
      {/* Your app content */}

      <ConciergeWidget
        projectId="project-123"
        projectPath="/path/to/project"
        projectType="nextjs"
        requesterName="Jane Doe"
        requesterEmail="jane@example.com"
      />
    </>
  );
}
```

### Using the Full Interface

```tsx
import ConciergeInterface from '@/app/features/Concierge/components/ConciergeInterface';

function ConciergePage() {
  return (
    <div className="h-screen">
      <ConciergeInterface
        projectId="project-123"
        projectPath="/path/to/project"
        projectType="nextjs"
        requesterName="Jane Doe"
        requesterEmail="jane@example.com"
      />
    </div>
  );
}
```

### API Integration

```typescript
// Create a feature request
const response = await fetch('/api/concierge/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-123',
    requesterName: 'Jane Doe',
    requesterEmail: 'jane@example.com',
    source: 'ui',
    naturalLanguageDescription: 'Add dark mode toggle to settings',
    priority: 'high',
  }),
});

const { data: request } = await response.json();

// Generate code
const generateResponse = await fetch('/api/concierge/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: request.id,
    projectPath: '/path/to/project',
    projectType: 'nextjs',
  }),
});

const { data: result } = await generateResponse.json();

// Commit code
const commitResponse = await fetch('/api/concierge/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: request.id,
    projectPath: '/path/to/project',
    autoCommit: true,
  }),
});
```

## External Integrations

### Notion
Use Notion Automations to POST to `/api/concierge/webhook` when pages are created in a Feature Requests database.

### Jira
Create Jira Automation Rules that trigger on issue creation and send webhooks.

### Slack
Create a Slack app with slash commands that POST to the webhook endpoint.

### Confluence
Use Confluence Automation to trigger webhooks when pages are created or updated.

See `docs/CONCIERGE_GUIDE.md` for detailed integration instructions.

## Code Generation Process

1. **Analysis Phase**
   - Load project contexts from database
   - Understand existing code structure
   - Identify relevant files and patterns

2. **Generation Phase**
   - Translate natural language to code requirements
   - Generate file structures following project conventions
   - Create tests using project's test framework
   - Write documentation in markdown

3. **Validation Phase**
   - Check for path alias usage (@/)
   - Verify TypeScript types
   - Ensure error handling
   - Validate Next.js conventions
   - Check for proper exports

4. **Review Phase**
   - Present to user for approval
   - Allow modifications
   - Show confidence score

5. **Commit Phase**
   - Write files to disk
   - Stage changes in Git
   - Create descriptive commit message
   - Push to repository (optional)

## Configuration

### Environment Variables

```bash
# Required for webhook security
CONCIERGE_WEBHOOK_SECRET=your-secret-here

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
CONCIERGE_AUTO_COMMIT=false
CONCIERGE_NOTIFY_EMAILS=dev1@example.com,dev2@example.com
```

### Project Settings

```typescript
interface ProjectConfig {
  concierge?: {
    enabled: boolean;
    autoCommit: boolean;
    developerEmails: string[];
    requiredApprovals: number;
  };
}
```

## File Structure

```
src/app/features/Concierge/
├── components/
│   ├── ConciergeInterface.tsx    # Main interface
│   └── ConciergeWidget.tsx       # Floating widget
├── lib/
│   ├── codeGenerator.ts          # AI code generation
│   └── notifications.ts          # Email notifications
└── README.md                     # This file

src/app/api/concierge/
├── requests/
│   └── route.ts                  # CRUD endpoints
├── generate/
│   └── route.ts                  # Code generation
├── commit/
│   └── route.ts                  # Git commit
└── webhook/
    └── route.ts                  # External integrations

src/app/db/
├── models/
│   └── feature-request.types.ts  # TypeScript types
└── repositories/
    └── feature-request.repository.ts  # Database operations
```

## Security

- **Webhook Authentication**: Secret token validation
- **Input Validation**: All user inputs are validated
- **Code Review**: Generated code requires approval before commit
- **Git Attribution**: Commits are properly attributed
- **Email Validation**: Requester emails are validated
- **Rate Limiting**: Should be implemented on webhook endpoint

## Testing

```bash
# Test code generation
curl -X POST http://localhost:3000/api/concierge/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "request-id",
    "projectPath": "/path/to/project",
    "projectType": "nextjs"
  }'

# Test webhook
curl -X POST http://localhost:3000/api/concierge/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "api",
    "projectId": "project-123",
    "requesterName": "Test User",
    "description": "Test feature request",
    "priority": "low",
    "webhookSecret": "your-secret"
  }'
```

## Troubleshooting

### Code Generation Fails
- Check LLM provider is configured
- Verify project contexts exist
- Check API rate limits
- Review error in events table

### Webhook Returns 401
- Verify webhook secret matches environment variable
- Check secret is included in request body

### Commits Fail
- Ensure Git is initialized in project
- Check file permissions
- Verify branch is not protected
- Check Git credentials

## Future Enhancements

- [ ] Multi-step wizards for complex features
- [ ] AI-powered requirement clarification dialog
- [ ] Voice input support
- [ ] Video demonstration parsing
- [ ] Automatic PR creation
- [ ] Integration with CI/CD pipelines
- [ ] Support for more programming languages
- [ ] Mobile app for feature requests

## Contributing

When adding new features to the Concierge:

1. Update database schema in `schema.ts`
2. Add types to `feature-request.types.ts`
3. Update repository in `feature-request.repository.ts`
4. Create/update API endpoints
5. Update UI components
6. Add to documentation
7. Write tests

## License

Part of the Vibeman project.
