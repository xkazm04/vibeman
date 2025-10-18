# Claude Code Integration

This document describes the Claude Code automation integration added to Vibeman.

## Overview

The Claude Code integration allows you to initialize and manage `.claude` folders in your projects directly from the Vibeman UI. This enables you to create custom requirements and automation scripts that can be executed by Claude Code in your terminal.

## Features

### 1. `.claude` Folder Management
- **Check Status**: Automatically detect if a `.claude` folder exists and is properly initialized
- **Initialize Folder**: Create the complete `.claude` folder structure with one click
- **Folder Structure**:
  ```
  .claude/
  ├── scripts/       # Automation scripts
  ├── commands/      # Custom slash commands (requirements)
  ├── agents/        # Custom agent configurations
  ├── settings.json  # Project-specific settings
  └── CLAUDE.md      # Context and instructions for Claude
  ```

### 2. Requirement Creator
- **Create Requirements**: Write custom requirements that Claude Code can execute
- **List Requirements**: View all existing requirements in your project
- **Delete Requirements**: Remove requirements you no longer need
- **Markdown Support**: Full markdown formatting for requirement descriptions

### 3. UI Integration
- **Claude Button**: Added to the Projects toolbar (purple gradient)
- **Modal Interface**: Beautiful, responsive modal for managing Claude Code settings
- **Status Indicators**: Visual feedback for initialization status
- **Error Handling**: Clear error messages and retry mechanisms

## Usage

### Accessing the Claude Code Modal

1. Open Vibeman in your browser
2. Make sure you have an active project selected
3. Click the **"Claude"** button in the Projects toolbar (purple button with FileCode icon)

### Initializing a `.claude` Folder

1. Open the Claude Code modal
2. If the folder is not initialized, you'll see the initialization screen
3. Click **"Initialize Claude Folder"**
4. The system will create all necessary folders and files
5. Once complete, you'll be taken to the requirement creator

### Creating Requirements

1. Open the Claude Code modal (folder must be initialized)
2. Enter a **Requirement Name** (e.g., `add-login-feature`)
   - Use lowercase letters, numbers, and hyphens only
   - This will be the slash command name
3. Enter the **Requirement Content** in markdown format
   - Describe what you want Claude Code to do
   - Be specific and detailed
4. Click **"Create Requirement"**
5. The requirement will be saved to `.claude/commands/`

### Using Requirements in Terminal

Once you've created requirements, you can use them in Claude Code:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Open Claude Code terminal
claude code

# Execute your requirement
/your-requirement-name
```

## Example Requirement

**Name**: `add-auth-system`

**Content**:
```markdown
Create a complete authentication system with the following features:

1. User registration with email and password
2. Login functionality with JWT tokens
3. Password reset flow
4. Email verification
5. Protected routes middleware

Implementation requirements:
- Use bcrypt for password hashing
- Store tokens in httpOnly cookies
- Add rate limiting for auth endpoints
- Write tests for all auth flows
- Update documentation

File structure:
- src/auth/register.ts
- src/auth/login.ts
- src/auth/reset-password.ts
- src/auth/middleware.ts
- tests/auth.test.ts
```

## API Endpoints

The integration adds a new API route: `/api/claude-code`

### GET Requests

**Check Status**:
```
GET /api/claude-code?projectPath=/path&action=status
```

**List Requirements**:
```
GET /api/claude-code?projectPath=/path&action=list-requirements
```

**Read Requirement**:
```
GET /api/claude-code?projectPath=/path&action=read-requirement&name=my-requirement
```

**Read Settings**:
```
GET /api/claude-code?projectPath=/path&action=read-settings
```

### POST Requests

**Initialize Folder**:
```json
POST /api/claude-code
{
  "projectPath": "/path/to/project",
  "action": "initialize",
  "projectName": "My Project"
}
```

**Create Requirement**:
```json
POST /api/claude-code
{
  "projectPath": "/path/to/project",
  "action": "create-requirement",
  "requirementName": "my-requirement",
  "content": "Requirement content in markdown..."
}
```

**Update Settings**:
```json
POST /api/claude-code
{
  "projectPath": "/path/to/project",
  "action": "update-settings",
  "settings": {
    "customConfig": { "key": "value" }
  }
}
```

### DELETE Requests

**Delete Requirement**:
```json
DELETE /api/claude-code
{
  "projectPath": "/path/to/project",
  "requirementName": "my-requirement"
}
```

## Architecture

### Components

**`ClaudeCodeModal.tsx`**: Main modal component that manages the UI flow
- Checks Claude folder status on open
- Routes to either Initializer or RequirementCreator based on status
- Handles error states and loading indicators

**`ClaudeInitializer.tsx`**: Component for initializing `.claude` folder
- Provides information about the folder structure
- Handles initialization with API calls
- Shows success/error feedback

**`ClaudeRequirementCreator.tsx`**: Component for creating and managing requirements
- Form for creating new requirements
- List of existing requirements
- Delete functionality for requirements

### Utility Functions

**`src/lib/claudeCodeManager.ts`**: Core utility functions
- `claudeFolderExists()`: Check if `.claude` folder exists
- `isClaudeFolderInitialized()`: Verify complete initialization
- `initializeClaudeFolder()`: Create folder structure
- `createRequirement()`: Write requirement files
- `readRequirement()`: Read requirement content
- `listRequirements()`: Get all requirements
- `deleteRequirement()`: Remove requirement files
- `updateClaudeSettings()`: Update settings.json
- `readClaudeSettings()`: Read current settings

### State Management

**`projectsToolbarStore.ts`**: Updated to include:
- `showClaudeCode`: Modal visibility state
- `setShowClaudeCode()`: Toggle modal

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── claude-code/
│   │       └── route.ts              # API endpoint
│   └── projects/
│       ├── Claude/
│       │   ├── ClaudeCodeModal.tsx
│       │   ├── ClaudeInitializer.tsx
│       │   ├── ClaudeRequirementCreator.tsx
│       │   └── index.ts
│       └── ProjectsLayout.tsx        # Updated with Claude button
├── lib/
│   └── claudeCodeManager.ts          # Core utilities
└── stores/
    └── projectsToolbarStore.ts       # Updated with Claude state
```

## Technical Details

### File System Operations
- Uses Node.js `fs` module for file operations
- Creates directories recursively
- Writes UTF-8 encoded files
- Handles Windows and Unix paths

### Sanitization
- Requirement names are sanitized for filesystem safety
- Converts to lowercase
- Replaces non-alphanumeric characters with hyphens
- Removes leading/trailing hyphens

### Error Handling
- Try-catch blocks for all file operations
- Detailed error messages returned to UI
- Graceful fallbacks for missing files
- Validation of required parameters

## Best Practices

### Requirement Naming
- Use descriptive names: `add-feature-x` not just `feature`
- Use hyphens for multi-word names: `implement-auth-system`
- Keep names concise: prefer `add-login` over `add-complete-login-system-with-validation`

### Requirement Content
- Start with a clear summary
- Break down into numbered steps
- Specify file paths when relevant
- Include test requirements
- Add implementation notes

### Project Organization
- Keep requirements focused on single features
- Create separate requirements for different aspects
- Use clear, descriptive titles
- Document expected outcomes

## Troubleshooting

### Modal Won't Open
- Ensure you have an active project selected
- Check browser console for errors

### Initialization Fails
- Verify the project path is correct
- Check write permissions on the project directory
- Ensure the project directory exists

### Requirements Not Showing
- Check `.claude/commands/` folder exists
- Verify files have `.md` extension
- Refresh the modal to reload the list

### Claude Code Can't Find Requirements
- Ensure you're in the correct project directory
- Check that the requirement file exists in `.claude/commands/`
- Try restarting Claude Code terminal

## Future Enhancements

Potential improvements for future versions:
- Requirement templates
- Requirement versioning
- Requirement categories/tags
- Import/export requirements
- Requirement sharing between projects
- Visual requirement editor
- Requirement execution preview
- Integration with project goals

## Related Documentation

- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Project Management Guide](./PROJECT_MANAGEMENT.md)
- [API Endpoints](./API_ENDPOINTS.md)
