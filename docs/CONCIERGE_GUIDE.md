# AI Code Concierge Guide

## Overview

The AI Code Concierge is a natural-language interface that allows non-technical stakeholders (business users, product managers, designers) to request new features or fixes. Claude AI translates these descriptions into code skeletons, tests, and documentation, automatically commits them to the repository, and notifies developers.

## Features

### 🎯 For Business Users
- **Plain English Requests**: Describe features in natural language without any technical knowledge
- **Priority Management**: Set priority levels (low, medium, high, urgent)
- **Real-time Status**: Track the progress of your requests
- **Automatic Notifications**: Get notified when your feature is implemented

### 🤖 For Developers
- **AI-Generated Code**: Claude generates production-ready code skeletons
- **Automatic Testing**: Test files are generated alongside the code
- **Documentation**: Features come with auto-generated documentation
- **Review & Approve**: Review AI-generated code before it's committed
- **Git Integration**: Automatic commits with proper attribution

### 🔗 Integration Support
- **Web UI**: Built-in interface for direct submissions
- **Notion**: Submit requests from Notion pages
- **Jira**: Create feature requests from Jira tickets
- **Confluence**: Submit from Confluence pages
- **Slack**: Request features via Slack commands
- **Custom Webhooks**: Integrate with any tool via REST API

## Getting Started

### Using the Web Interface

1. **Access the Concierge**
   - Click the sparkle icon (✨) in the bottom-right corner
   - Or navigate to the Concierge tab in the application

2. **Submit a Feature Request**
   ```
   Add a dark mode toggle to the settings page with user
   preference persistence. The toggle should be visible in
   the header and remember the user's choice between sessions.
   ```

3. **Set Priority**
   - Low: Nice to have, no urgency
   - Medium: Standard feature request
   - High: Important for upcoming release
   - Urgent: Critical or blocking issue

4. **Review Generated Code**
   - AI analyzes your request and generates code
   - Review the analysis and generated files
   - Approve to commit or reject to discard

### Using Webhooks

#### Setup
1. Set your webhook secret in environment variables:
   ```bash
   CONCIERGE_WEBHOOK_SECRET=your-secret-here
   ```

2. Configure your external tool to POST to:
   ```
   https://your-domain.com/api/concierge/webhook
   ```

#### Example Payload (Notion)
```json
{
  "source": "notion",
  "projectId": "project-123",
  "requesterName": "Jane Doe",
  "requesterEmail": "jane@example.com",
  "description": "Add user authentication with email and password",
  "priority": "high",
  "metadata": {
    "notionPageId": "abc-def-123",
    "assignee": "john@example.com"
  },
  "webhookSecret": "your-secret-here"
}
```

#### Example Payload (Jira)
```json
{
  "source": "jira",
  "projectId": "project-123",
  "requesterName": "John Smith",
  "requesterEmail": "john@example.com",
  "description": "Implement shopping cart functionality with checkout",
  "priority": "high",
  "metadata": {
    "jiraIssueKey": "PROJ-123",
    "issueType": "Story",
    "sprint": "Sprint 5"
  },
  "webhookSecret": "your-secret-here"
}
```

#### Example Payload (Slack)
```json
{
  "source": "slack",
  "projectId": "project-123",
  "requesterName": "Alice Johnson",
  "requesterEmail": "alice@example.com",
  "description": "Add export to CSV functionality for reports",
  "priority": "medium",
  "metadata": {
    "channelId": "C123ABC",
    "messageTs": "1234567890.123456",
    "userId": "U456DEF"
  },
  "webhookSecret": "your-secret-here"
}
```

### Notion Integration

1. **Create a Notion Automation**
   - Trigger: When a page is created in your "Feature Requests" database
   - Action: Webhook POST to `/api/concierge/webhook`

2. **Map Notion Properties**
   ```javascript
   {
     "source": "notion",
     "projectId": "{{ properties.Project.id }}",
     "requesterName": "{{ properties.Requester.name }}",
     "requesterEmail": "{{ properties.Email.email }}",
     "description": "{{ properties.Description.text }}",
     "priority": "{{ properties.Priority.select }}",
     "metadata": {
       "notionPageId": "{{ page.id }}",
       "notionUrl": "{{ page.url }}"
     },
     "webhookSecret": "your-secret-here"
   }
   ```

### Jira Integration

1. **Create a Jira Automation Rule**
   - Trigger: Issue created
   - Condition: Issue type = "Feature Request"
   - Action: Send web request

2. **Configure the Webhook**
   ```javascript
   POST https://your-domain.com/api/concierge/webhook
   Content-Type: application/json

   {
     "source": "jira",
     "projectId": "{{issue.project.key}}",
     "requesterName": "{{issue.reporter.displayName}}",
     "requesterEmail": "{{issue.reporter.emailAddress}}",
     "description": "{{issue.summary}}\n\n{{issue.description}}",
     "priority": "{{issue.priority.name | lowercase}}",
     "metadata": {
       "jiraIssueKey": "{{issue.key}}",
       "issueType": "{{issue.issueType.name}}",
       "sprint": "{{issue.sprint.name}}"
     },
     "webhookSecret": "your-secret-here"
   }
   ```

### Slack Integration

1. **Create a Slack App**
   - Go to https://api.slack.com/apps
   - Create a new app
   - Add a slash command: `/request-feature`

2. **Configure Slash Command**
   - Command: `/request-feature`
   - Request URL: `https://your-domain.com/api/concierge/webhook`
   - Short Description: "Request a new feature"

3. **Handle the Webhook**
   The Concierge will parse Slack's payload format automatically.

## API Reference

### Create Feature Request
```http
POST /api/concierge/requests
Content-Type: application/json

{
  "projectId": "project-123",
  "requesterName": "Jane Doe",
  "requesterEmail": "jane@example.com",
  "source": "ui",
  "naturalLanguageDescription": "Add dark mode toggle",
  "priority": "medium"
}
```

### Generate Code
```http
POST /api/concierge/generate
Content-Type: application/json

{
  "requestId": "request-id-here",
  "projectPath": "/path/to/project",
  "projectType": "nextjs"
}
```

### Commit Code
```http
POST /api/concierge/commit
Content-Type: application/json

{
  "requestId": "request-id-here",
  "projectPath": "/path/to/project",
  "autoCommit": true,
  "commitMessage": "Optional custom message"
}
```

### Get Request Status
```http
GET /api/concierge/requests?requestId=request-id-here
```

### List Project Requests
```http
GET /api/concierge/requests?projectId=project-123
```

### Webhook Endpoint
```http
POST /api/concierge/webhook
Content-Type: application/json

{
  "source": "notion|jira|confluence|slack|api",
  "projectId": "project-123",
  "requesterName": "Name",
  "requesterEmail": "email@example.com",
  "description": "Feature description",
  "priority": "low|medium|high|urgent",
  "metadata": {},
  "webhookSecret": "your-secret"
}
```

## Best Practices

### Writing Good Feature Requests

✅ **Good Examples:**
- "Add a search bar to the header that filters products by name and shows results as you type"
- "Implement user authentication with email/password, including forgot password flow and email verification"
- "Create an admin dashboard showing user statistics, revenue charts, and recent activity logs"

❌ **Poor Examples:**
- "Make it better" (too vague)
- "Add search" (lacks detail)
- "Fix the bug" (not a feature request)

### Request Structure
1. **What**: Clearly state what feature you want
2. **Where**: Specify where it should appear
3. **Behavior**: Describe how it should work
4. **Edge Cases**: Mention any special scenarios

### Priority Guidelines
- **Low**: Feature enhancements, minor improvements
- **Medium**: Standard new features, non-blocking issues
- **High**: Important features for upcoming milestones
- **Urgent**: Blocking issues, critical bugs, time-sensitive features

## Developer Workflow

### 1. Review Requests
- Check the Concierge dashboard for pending requests
- Review AI-generated analysis and code
- Validate against project standards

### 2. Approve or Modify
- **Approve**: Code is committed automatically
- **Modify**: Edit generated code before committing
- **Reject**: Decline the request with feedback

### 3. Test
- Run generated tests
- Add additional test cases if needed
- Verify functionality in dev environment

### 4. Deploy
- Merge to main branch
- Deploy to staging/production
- Notify requester of completion

## Configuration

### Environment Variables
```bash
# Required
CONCIERGE_WEBHOOK_SECRET=your-secret-here

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
CONCIERGE_AUTO_COMMIT=true
CONCIERGE_NOTIFY_EMAILS=dev1@example.com,dev2@example.com
```

### Project Settings
Configure per-project settings in the project configuration:
```typescript
{
  concierge: {
    enabled: true,
    autoCommit: false,
    developerEmails: ['dev@example.com'],
    requiredApprovals: 1
  }
}
```

## Troubleshooting

### Code Generation Fails
- Check LLM provider configuration
- Verify project path is correct
- Ensure sufficient API credits/quota
- Review error logs in events panel

### Webhook Not Working
- Verify webhook secret matches
- Check payload format matches documentation
- Ensure webhook URL is accessible
- Review network logs in external tool

### Commits Not Working
- Verify Git is configured in project
- Check file permissions
- Ensure branch is not protected
- Review Git configuration

## Security Considerations

1. **Webhook Secret**: Always use a strong, unique secret
2. **Email Validation**: Validate requester emails
3. **Code Review**: Always review generated code before deployment
4. **Rate Limiting**: Implement rate limits on webhook endpoint
5. **Access Control**: Restrict who can approve/commit code

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice input for requests
- [ ] Video demonstrations for complex features
- [ ] AI-powered requirement clarification
- [ ] Automatic A/B testing setup
- [ ] Integration with more tools (Linear, Asana, etc.)
- [ ] Mobile app for on-the-go requests

## Support

For issues or questions:
- Check the event logs in the Monitor panel
- Review the implementation logs
- Check the database: `database/goals.db` table `feature_requests`
- Report issues on GitHub

---

**AI Code Concierge** - Bridging the gap between business and code
