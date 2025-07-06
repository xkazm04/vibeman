# Complete Automated Cursor Task Workflow

## Architecture Overview

```
NextJS App (localhost:3000)
    ↓
Task Generation API
    ↓
File System (cursor-tasks/)
    ↓
MCP Server (optional - stdio process)
    ↓
Cursor Background Agents
    ↓
GitHub PRs
```

## Complete Setup & Startup Guide

### Step 1: Initial Project Setup

```bash
# Create folder structure
mkdir my-automation-project
cd my-automation-project

# Clone or create your main project
git clone your-main-project
cd your-main-project

# Create task directory
mkdir cursor-tasks

# Go back and create NextJS control panel
cd ..
npx create-next-app@latest task-generator --typescript
cd task-generator
```

### Step 2: Install Dependencies

```bash
# In your NextJS app (task-generator/)
npm install @modelcontextprotocol/sdk

# Create necessary directories
mkdir -p pages/api/cursor-tasks
mkdir -p components
```

### Step 3: Setup File Structure

Your complete structure should look like:
```
my-automation-project/
├── task-generator/           # NextJS control panel
│   ├── pages/
│   │   ├── api/
│   │   │   └── cursor-tasks/
│   │   │       ├── generate.ts
│   │   │       └── status.ts
│   │   └── index.tsx
│   └── mcp-task-server.js  # MCP server file
│
└── your-main-project/       # Your actual project
    ├── cursor-tasks/        # Generated tasks go here
    ├── .cursor/
    │   └── mcp.json        # MCP configuration
    └── .cursorrules        # Project rules
```

### Step 4: Configure MCP Server (Optional but Recommended)

1. **Create MCP configuration** in `your-main-project/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "task-executor": {
      "command": "node",
      "args": ["../task-generator/mcp-task-server.js"],
      "env": {
        "TASK_DIR": "./cursor-tasks"
      }
    }
  }
}
```

2. **Important**: The MCP server path must be relative to your main project!

### Step 5: Starting Everything - The Complete Process

## 🚀 Full Startup Sequence

### Terminal 1: Start NextJS Control Panel
```bash
cd my-automation-project/task-generator
npm run dev
# This starts your control panel at http://localhost:3000
```

### Terminal 2: Open Your Main Project in Cursor
```bash
cd my-automation-project/your-main-project
cursor .  # Opens Cursor IDE
```

### In Cursor IDE: Enable MCP Server
1. Open Command Palette: `Cmd/Ctrl + Shift + P`
2. Search for "Cursor Settings"
3. Navigate to MCP section
4. You should see "task-executor" listed
5. Click to enable it
6. The MCP server will start automatically when you use it

### Starting Background Agents in Cursor

#### Method A: Using Keyboard Shortcut
1. Press `Cmd+E` (Mac) or `Ctrl+E` (Windows/Linux)
2. This opens the Background Agent interface

#### Method B: Using Cloud Icon
1. Look for the cloud icon (☁️) in the chat interface
2. Click it to start a Background Agent

#### Method C: Using Chat Commands
1. Open Cursor chat
2. Type: "Start a background agent to work on tasks"

## 📋 Complete Workflow Example

### 1. Generate Tasks (Browser)
```
1. Open http://localhost:3000 in your browser
2. Create tasks using the UI
3. Click "Generate Cursor Task Files"
4. Files are created in your-main-project/cursor-tasks/
```

### 2. Execute Tasks in Cursor

#### Option A: Direct Execution (No MCP)
```
# In Background Agent chat:
"Please read all tasks from ./cursor-tasks/ directory. 
Execute each task according to its priority, creating separate branches and PRs."
```

#### Option B: Using MCP Tools (If Configured)
```
# The agent can now use these commands:
"List all pending tasks"
"Get the next high priority task and execute it"
"Update task status after completion"
```

### 3. Monitor Progress

#### From NextJS Dashboard:
```
http://localhost:3000/dashboard
# Shows task status, PR links, completion rates
```

#### From Cursor Web Interface:
- Access via browser (Pro+ subscribers)
- Monitor agent progress
- View code changes

## 🔄 Automated Execution Flow

### One-Time Setup Script
Create `setup-automation.sh`:
```bash
#!/bin/bash

echo "🚀 Starting Cursor Task Automation System"

# Start NextJS in background
echo "📱 Starting control panel..."
cd task-generator && npm run dev &
NEXTJS_PID=$!

echo "✅ Control panel running at http://localhost:3000"
echo "📂 Open your main project in Cursor IDE"
echo "☁️ Press Cmd/Ctrl+E to start Background Agents"

# Keep script running
wait $NEXTJS_PID
```

### Daily Workflow Script
Create `run-daily-tasks.md` in your project:
```markdown
# Daily Task Execution Protocol for Cursor Agent

## Morning Routine
1. Check ./cursor-tasks/_manifest.json for new tasks
2. List all pending tasks by priority
3. For each HIGH priority task:
   - Read task file
   - Create feature branch
   - Implement solution
   - Run tests
   - Create PR
   - Update manifest

## Afternoon Routine
1. Process MEDIUM priority tasks
2. Generate status report
3. Update task tracking
```

Then in Cursor: "Please follow the daily task execution protocol in run-daily-tasks.md"

## 🎮 Control Commands Reference

### NextJS API Endpoints
```javascript
// Generate tasks
POST http://localhost:3000/api/cursor-tasks/generate
Body: { tasks: [...], projectPath: "/path/to/project" }

// Check status
GET http://localhost:3000/api/cursor-tasks/status

// Update task
PUT http://localhost:3000/api/cursor-tasks/update
Body: { taskId: "task-001", status: "completed" }
```

### Cursor Agent Commands
```
# List tasks
"Show me all pending tasks in cursor-tasks directory"

# Execute specific task
"Execute task-001.md from cursor-tasks"

# Batch execution
"Execute all HIGH priority tasks from cursor-tasks"

# Status update
"Mark task-001 as completed and update the manifest"
```

### MCP Tool Commands (When Enabled)
```
# Available tools:
- list_tasks(status: "pending")
- get_task(taskId: "task-001")
- execute_task(taskId: "task-001", autoCommit: true)
- update_task_status(taskId: "task-001", status: "completed")
- get_next_task()
```

## 🔍 Troubleshooting

### MCP Server Not Showing
1. Check `.cursor/mcp.json` exists
2. Verify path to mcp-task-server.js is correct
3. Restart Cursor IDE
4. Check Cursor Settings > MCP

### Background Agent Not Working
1. Ensure you're on Pro plan or higher
2. Check privacy mode is disabled
3. Try cloud icon instead of shortcut

### Tasks Not Found
1. Verify file paths are correct
2. Check cursor-tasks directory exists
3. Ensure _manifest.json is generated

### NextJS Connection Issues
1. Check if running on port 3000
2. Verify CORS settings if needed
3. Check API route paths

## 💡 Pro Tips

1. **Batch Processing**: Create a "batch-processor.md" with instructions for processing multiple tasks

2. **Task Templates**: Use your NextJS app to create task templates for common patterns

3. **Status Webhook**: Add a webhook to notify when tasks complete:
```javascript
// In your task completion handler
await fetch('http://localhost:3000/api/cursor-tasks/webhook', {
  method: 'POST',
  body: JSON.stringify({ taskId, status: 'completed', pr: prUrl })
});
```

4. **Auto-refresh**: Add polling to your NextJS dashboard:
```javascript
useEffect(() => {
  const interval = setInterval(fetchStatus, 30000); // Every 30s
  return () => clearInterval(interval);
}, []);
```

## 🎯 Quick Start Checklist

- [ ] Create folder structure
- [ ] Install NextJS app with dependencies
- [ ] Copy all artifact code files
- [ ] Configure .cursor/mcp.json
- [ ] Start NextJS server
- [ ] Open project in Cursor
- [ ] Enable MCP server in settings
- [ ] Generate first batch of tasks
- [ ] Start Background Agent (Cmd/Ctrl+E)
- [ ] Execute first task as test
- [ ] Monitor progress

This complete setup gives you a powerful automation system where your NextJS app acts as the control center and Cursor Background Agents act as the workers!