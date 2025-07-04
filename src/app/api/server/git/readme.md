1. Updated Types (types/index.ts)

Added git configuration to Project interface
Created GitStatus interface to track repository state
Support for repository URL, branch, and auto-sync options

2. Updated Config (lib/config.ts)

Added Git configuration to your projects
You need to update the repository URLs with your actual GitHub repos
autoSync option for automatic pulling on project start (optional)

3. Git Manager (lib/git/gitManager.ts)

Complete Git operations class with:

Status checking (ahead/behind commits)
Fetching latest changes
Pulling updates
Branch switching
Repository cloning
Uncommitted changes detection



4. Pull Button Component (app/runner/components/PullButton.tsx)

Beautiful dropdown UI showing:

Current branch
Commits ahead/behind
Uncommitted changes warning
Pull button with loading states
Auto-refresh status


Visual indicators:

Yellow dot for available updates
Status colors for different states


RetryMKContinueEdit
5. API Routes

/api/git/status - Check repository status
/api/git/pull - Pull latest changes (with safety checks)
/api/git/clone - Clone new repositories (optional)

6. Integration with ProjectCard

Added PullButton next to Settings button
Only shows for projects with Git configuration
Prevents pulling while server is running
Visual feedback for all operations


Safety Checks

✅ Prevents pulling with uncommitted changes
✅ Prevents pulling while server is running
✅ Checks if directory is a Git repository
✅ Handles branch switching automatically

Visual Feedback

🟡 Yellow indicator when updates are available
📊 Shows commits ahead/behind
⚠️ Warns about uncommitted changes
✅ Success/error messages

Auto-Updates

Status refreshes every 30 seconds when dropdown is open
Manual refresh button available
Real-time status after pull operations

Setup Instructions:

Update your config with actual GitHub repository URLs:

typescriptgit: {
  repository: 'https://github.com/yourusername/vibeman.git',
  branch: 'main',
  autoSync: true
}

Ensure Git is installed on your system and accessible from command line
Initialize Git in your project directories if not already done:

bashcd C:\Users\kazda\mk\vibeman
git init
git remote add origin https://github.com/yourusername/vibeman.git
Usage:

Check Status: Click the Git branch icon to see repository status
Pull Updates: Click "Pull" button when updates are available
Safety: The system prevents pulling when:

Server is running (stop it first)
You have uncommitted changes
There are merge conflicts



Advanced Features You Could Add:

Auto-sync on start:

typescript// In handleStart function
if (project.git?.autoSync) {
  await pullLatestChanges();
}

Commit & Push UI: Add buttons to commit and push changes
Branch Management: UI to create/switch branches
Diff Viewer: Show what files changed in the pull
Webhooks: Listen for GitHub webhooks to detect pushes instantly

The system is now fully integrated and ready to use! Just update the repository URLs in your config and you'll be able to pull updates directly from the app manager UI.