# Vibeman Automation - Testing & Debugging Guide

## Quick Verification Steps

### 1. Visual Verification

When you select a specific project in the Ideas page, you should see:

1. **Yellow Debug Panel** (at the top) with:
   - Project ID and Path displayed
   - "Test API Call" button
   - Click counter

2. **Power Vibeman Button** (purple/pink gradient) on the right side

### 2. Test the Debug Button First

**Steps:**
1. Navigate to `/ideas` page
2. Select a **specific project** from the ProjectFilter dropdown (not "all")
3. Click the yellow "Test API Call" button
4. **Expected Results:**
   - Console logs showing:
     ```
     [Vibeman Debug] Test button clicked
     [Vibeman Debug] projectId: <your-project-id>
     [Vibeman Debug] projectPath: <your-project-path>
     [Vibeman Debug] Calling API...
     [Vibeman Debug] Response status: 200
     [Vibeman Debug] Response data: {pendingIdeasCount: X, ...}
     ```
   - Alert popup showing: "API Test Success! Pending: X, Click count: 1"
   - Click counter increments

5. **If this fails:**
   - Check console for errors
   - Verify API endpoint exists: `vibeman/src/app/api/ideas/vibeman/route.ts`
   - Verify Ollama is running (needed for evaluation)

### 3. Test the Power Button

**Steps:**
1. After debug test passes, click the **"Power Vibeman"** button
2. **Expected Results:**
   - Console logs showing:
     ```
     [Vibeman] handleToggle called, isRunning: false
     [Vibeman] projectId: <id>, projectPath: <path>
     [Vibeman] Starting automation...
     [Vibeman] About to call runAutomationCycle
     [Vibeman] Evaluating ideas...
     [Vibeman] Calling API with: {projectId, projectPath, action: 'evaluate-and-select'}
     [Vibeman] Evaluate response status: 200
     [Vibeman] Evaluation result: {...}
     ```
   - Button changes to red/orange gradient ("Stop Vibeman")
   - Status changes from "Ready" → "Evaluating Ideas"
   - Success/failure counters appear

3. **If button click does nothing:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for API calls to `/api/ideas/vibeman`
   - Verify you see `[Vibeman] handleToggle called` in console

## Common Issues & Solutions

### Issue 1: Button Not Visible

**Problem:** Power Vibeman button doesn't appear

**Solution:**
- Ensure you selected a **specific project** (not "all projects")
- Check that `selectedProject` has a valid `path` property
- Verify in console: The yellow debug panel should show valid Project ID and Path

### Issue 2: "No suitable ideas" Message

**Problem:** Automation starts but immediately stops with "No suitable ideas to implement"

**Possible Causes:**
1. **No pending ideas** - All ideas are already accepted/rejected/implemented
2. **No ideas for selected project** - Check ideas belong to the correct project
3. **Missing effort/impact ratings** - Ideas need effort and impact values

**Solution:**
- Check ideas in the database:
  ```sql
  SELECT id, title, status, effort, impact FROM ideas WHERE project_id = '<your-project-id>';
  ```
- Ensure at least one idea has status = 'pending'
- Regenerate ideas with the new LLM prompts that include effort/impact

### Issue 3: API Error "Failed to evaluate ideas"

**Problem:** Evaluation fails with API error

**Possible Causes:**
1. Ollama not running
2. Ollama model not available
3. Database connection issue

**Solution:**
1. **Check Ollama:**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should return list of available models

2. **Verify environment variable:**
   ```bash
   # Check .env file
   OLLAMA_BASE_URL=http://localhost:11434
   ```

3. **Test Ollama directly:**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "llama2",
     "prompt": "Hello",
     "stream": false
   }'
   ```

### Issue 4: Implementation Fails

**Problem:** Idea is selected but implementation fails

**Possible Causes:**
1. Claude Code not initialized
2. `.claude` folder missing
3. Execution queue error

**Solution:**
1. **Verify Claude folder exists:**
   ```bash
   ls -la <project-path>/.claude
   ```
   Should have: `requirements/`, `custom_instructions.md`, `settings.json`

2. **Check execution queue:**
   - Navigate to Claude page in app
   - Check task list for errors
   - Review logs in `.claude/logs/`

3. **Initialize Claude Code:**
   - Go to Claude page
   - Click "Initialize" button for your project

## Detailed Console Output Guide

### Successful Flow

```
[Vibeman] handleToggle called, isRunning: false
[Vibeman] projectId: abc-123, projectPath: C:/projects/myproject
[Vibeman] Starting automation...
[Vibeman] About to call runAutomationCycle
[Vibeman] Evaluating ideas...
[Vibeman] Calling API with: {projectId: "abc-123", projectPath: "C:/projects/myproject", action: "evaluate-and-select"}
[Vibeman] Evaluate response status: 200
[Vibeman] Evaluation result: {selectedIdeaId: "idea-xyz", reasoning: "..."}
[Vibeman] Implementing idea: idea-xyz
[Vibeman] Updated idea status to accepted
[Vibeman] Creating requirement: idea-xyz-add-feature
[Vibeman] Requirement created successfully
[Vibeman] Requirement queued for execution: task-123
[Vibeman] 🔍 get-task-status: {status: "running"}
[Vibeman] 🔍 get-task-status: {status: "running"}
[Vibeman] 🔍 get-task-status: {status: "completed"}
[Vibeman] Task completed successfully
```

### Error Cases

**No Ideas:**
```
[Vibeman] Evaluation result: {selectedIdeaId: null, reasoning: "No pending ideas available"}
[Vibeman] No suitable idea found
```

**API Error:**
```
[Vibeman] Evaluate response status: 500
[Vibeman] Evaluate API error: {error: "OLLAMA_BASE_URL not configured"}
Error: OLLAMA_BASE_URL not configured
```

**Implementation Error:**
```
[Vibeman] Implementation failed, rolling back idea status
[Vibeman] Automation error: Error: Failed to create requirement
```

## API Endpoint Testing

### Test Get Status

```bash
curl -X POST http://localhost:3000/api/ideas/vibeman \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "projectPath": "/path/to/project",
    "action": "get-status"
  }'
```

**Expected Response:**
```json
{
  "pendingIdeasCount": 5,
  "acceptedIdeasCount": 2,
  "implementedIdeasCount": 3,
  "openGoalsCount": 4
}
```

### Test Evaluate & Select

```bash
curl -X POST http://localhost:3000/api/ideas/vibeman \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "projectPath": "/path/to/project",
    "action": "evaluate-and-select"
  }'
```

**Expected Response:**
```json
{
  "selectedIdeaId": "idea-abc-123",
  "reasoning": "This idea has the best effort-to-impact ratio (impact: 3, effort: 1)...",
  "effortImpactScore": "3.0",
  "goalAlignment": "Directly supports goal: Improve user experience"
}
```

## Database Checks

### Check Pending Ideas

```sql
SELECT
  id,
  title,
  effort,
  impact,
  status,
  category
FROM ideas
WHERE project_id = 'your-project-id'
  AND status = 'pending'
ORDER BY
  (CAST(impact AS FLOAT) / NULLIF(CAST(effort AS FLOAT), 0)) DESC;
```

### Check Project Goals

```sql
SELECT
  id,
  title,
  status
FROM goals
WHERE project_id = 'your-project-id'
  AND status IN ('open', 'in_progress');
```

## Performance Monitoring

### Expected Timings

- **Evaluation**: 5-10 seconds (Ollama LLM)
- **Requirement Generation**: 1-2 seconds
- **Task Queueing**: < 1 second
- **Implementation**: 1-10+ minutes (Claude Code)
- **Total per Idea**: 2-12 minutes

### Resource Usage

- **CPU**: Moderate during LLM evaluation
- **Memory**: ~500MB-1GB for Ollama
- **Network**: Minimal (local API calls only)

## Removing Debug Components

After testing is successful, remove the debug component:

1. Open `vibeman/src/app/features/Ideas/components/IdeasHeader.tsx`
2. Remove these lines:
   ```typescript
   import { VibemanDebug } from '../sub_Vibeman/VibemanDebug';

   // ... and later:
   <VibemanDebug
     projectId={selectedProjectId!}
     projectPath={selectedProjectPath!}
   />
   ```
3. Delete file: `vibeman/src/app/features/Ideas/sub_Vibeman/VibemanDebug.tsx`

## Next Steps

Once basic functionality works:

1. **Test with multiple ideas** - Verify continuous loop
2. **Test error handling** - Manually cause failures
3. **Monitor resource usage** - Check for memory leaks
4. **Review implemented code** - Verify quality of Claude Code output
5. **Adjust LLM prompts** - Fine-tune evaluation criteria

## Support

If issues persist:

1. Share console logs (full output)
2. Check Network tab in DevTools
3. Review API endpoint logs (server console)
4. Verify database schema matches expectations
5. Ensure all dependencies are installed

---

**Remember:** This is an experimental feature. Start with a test project and monitor the first few implementations closely.
