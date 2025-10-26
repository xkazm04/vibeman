# Vibeman Automation - Automated Project Management

## Overview

The Vibeman Automation system is a revolutionary feature that automates the entire development workflow from idea generation to implementation. It combines LLM-powered idea evaluation with Claude Code's automated implementation capabilities.

## Architecture

### Flow Comparison

**AS-IS (Manual Flow):**
1. LLM generates Ideas
2. User manually accepts Ideas
3. Accepted Ideas are transformed into Goals
4. LLM generates coding tasks from Goals
5. LLM performs coding via headless Claude Code

**TO-BE (Automated Flow):**
1. LLM generates Ideas (unchanged)
2. **LLM Project Manager** evaluates Ideas
3. **LLM Project Manager** generates coding tasks
4. **LLM Project Manager** handles coding queue automatically
5. Loop continues until stopped or no more ideas

## Components

### 1. API Endpoint (`/api/ideas/vibeman`)

**Location:** `vibeman/src/app/api/ideas/vibeman/route.ts`

**Actions:**
- `evaluate-and-select`: Evaluates all pending ideas and selects the best one
- `implement-idea`: Generates requirement file and queues execution
- `get-status`: Returns automation statistics

**Key Features:**
- Uses Ollama LLM for idea evaluation
- Evaluates ideas based on effort-to-impact ratio and goal alignment
- Automatic rollback on implementation failure
- Comprehensive error handling

### 2. Client Components

#### VibemanPowerButton
**Location:** `vibeman/src/app/features/Ideas/sub_Vibeman/VibemanPowerButton.tsx`

- Visual power button with gradient effects
- States: Idle, Running, Processing
- Pulsing animation when active
- Disabled state when no project selected

#### VibemanStatus
**Location:** `vibeman/src/app/features/Ideas/sub_Vibeman/VibemanStatus.tsx`

- Real-time status display
- Status types:
  - `idle`: Ready to start
  - `evaluating`: Analyzing ideas
  - `generating`: Creating requirement files
  - `executing`: Running Claude Code
  - `success`: Implementation complete
  - `error`: Failure occurred
- Success/failure counters with icons

#### VibemanAutomation (Main Orchestrator)
**Location:** `vibeman/src/app/features/Ideas/sub_Vibeman/VibemanAutomation.tsx`

- Manages the entire automation lifecycle
- Implements the continuous loop
- Monitors Claude Code task execution
- Handles start/stop functionality
- Automatic retry on failure

### 3. Integration

**Location:** `vibeman/src/app/ideas/page.tsx` and `vibeman/src/app/features/Ideas/components/IdeasHeader.tsx`

- Power button appears in the right upper corner of Ideas page
- Only visible when a specific project is selected
- Automatically refreshes ideas list after each implementation

## How It Works

### 1. Idea Evaluation

The LLM evaluates ideas using these criteria (in priority order):

1. **Effort-to-Impact Ratio**: Calculates `value = impact / effort`
   - Higher values are better (quick wins)
   - Low effort (1) + High impact (3) = Best candidate

2. **Goal Alignment**: How well the idea supports current project goals
   - Ideas aligned with open goals are prioritized
   - Considers goal descriptions and context

3. **Risk**: Lower-risk implementations preferred
   - Well-defined ideas with clear descriptions
   - Ideas with reasoning are preferred

4. **Dependencies**: Fewer dependencies = higher priority

### 2. LLM Prompt Structure

**System Prompt:**
```
You are an expert project manager AI responsible for selecting the best idea to implement next.

Selection criteria (in order of priority):
1. Effort-to-Impact Ratio: Prefer high-impact, low-effort ideas
2. Goal Alignment: Ideas that directly support open goals
3. Risk: Lower-risk implementations preferred
4. Dependencies: Ideas with fewer dependencies
```

**User Prompt Includes:**
- List of all pending ideas with metadata (effort, impact, description, reasoning)
- Current project goals (open/in_progress)
- Clear selection instructions

**Expected Response Format:**
```json
{
  "selectedIdeaId": "idea-id-here",
  "reasoning": "Why this idea was selected",
  "effortImpactScore": "calculated score",
  "goalAlignment": "alignment explanation"
}
```

### 3. Implementation Process

1. **Idea Selection**: LLM selects best idea
2. **Status Update**: Idea status → `accepted`
3. **Requirement Generation**: Creates `.md` file in `.claude/requirements/`
4. **Task Queueing**: Adds to Claude Code execution queue
5. **Monitoring**: Polls task status every 5 seconds
6. **Completion**: Updates counters and continues loop

### 4. Error Handling

**Rollback Mechanism:**
- If implementation fails, idea status is reverted to original state
- Failure counter is incremented
- System automatically moves to next idea

**Timeout Protection:**
- Max 120 polling attempts (10 minutes)
- Prevents infinite loops
- Automatic continuation to next idea

## Usage

### Starting Automation

1. Navigate to Ideas page (`/ideas`)
2. Select a specific project from ProjectFilter dropdown
3. Click **"Power Vibeman"** button in the header
4. Watch real-time status updates

### Stopping Automation

- Click **"Stop Vibeman"** button
- Current task will complete, but no new ideas will be processed
- Safe to stop at any time

### Monitoring

**Status Messages:**
- "Evaluating Ideas" - LLM is analyzing pending ideas
- "Generating Requirements" - Creating requirement file
- "Executing Implementation" - Claude Code is running
- "Implementation Complete" - Success, moving to next idea

**Counters:**
- Green ✓ counter: Successful implementations
- Red ✗ counter: Failed implementations

## Requirements

### Environment Variables

```bash
# Required for LLM evaluation
OLLAMA_BASE_URL=http://localhost:11434

# Required for Claude Code execution
# (same as existing Claude Code requirements)
```

### Prerequisites

1. Project must have Claude Code initialized (`.claude` folder)
2. Ollama must be running locally
3. Project must have at least one pending idea
4. Project must be properly configured in project settings

## Workflow Example

```
1. [User] Clicks "Power Vibeman"
   ↓
2. [System] Evaluates 10 pending ideas
   ↓
3. [LLM] Selects: "Add user authentication" (effort: 2, impact: 3)
   ↓
4. [System] Updates idea status to "accepted"
   ↓
5. [System] Generates requirement file: "idea-abc123-add-user-authentication.md"
   ↓
6. [System] Queues task for Claude Code
   ↓
7. [Claude Code] Implements authentication feature
   ↓
8. [System] Task completes successfully ✓
   ↓
9. [System] Increments success counter (1)
   ↓
10. [System] Evaluates remaining 9 ideas
    ↓
    (Loop continues...)
```

## Benefits

### 1. **Fully Automated Development**
- No manual intervention required
- Continuous implementation of ideas
- Works 24/7 until stopped

### 2. **Intelligent Prioritization**
- Data-driven idea selection
- Maximizes value delivery
- Considers project goals and context

### 3. **Risk Management**
- Automatic rollback on failure
- Continues despite errors
- Transparent error tracking

### 4. **Visibility**
- Real-time status updates
- Success/failure metrics
- Clear reasoning for selections

## Future Enhancements

### Planned Features

1. **Configurable Selection Strategy**
   - User-defined priority weights
   - Custom evaluation criteria
   - Different modes (speed, quality, balance)

2. **Batch Processing**
   - Process multiple ideas in parallel
   - Smart batching based on dependencies
   - Resource-aware scheduling

3. **Learning System**
   - Track implementation success patterns
   - Improve selection over time
   - Feedback loop from failures

4. **Integration with Goals**
   - Automatic goal creation from implemented ideas
   - Progress tracking against goals
   - Goal completion detection

5. **Advanced Monitoring**
   - Detailed execution logs
   - Performance metrics
   - Cost tracking (LLM tokens, time)

## Troubleshooting

### Common Issues

**1. Button Not Visible**
- Ensure a specific project is selected (not "all")
- Check that project has a valid path
- Verify project is properly configured

**2. "No suitable ideas" Message**
- Ensure project has pending ideas
- Check that ideas have effort/impact ratings
- Verify ideas are not all rejected

**3. Implementation Failures**
- Check Claude Code logs in `.claude/logs/`
- Verify Ollama is running
- Ensure project dependencies are installed

**4. Stuck in Processing**
- Wait for current task to complete (max 10 minutes)
- Check Claude Code execution queue
- Restart if necessary

## Technical Details

### Database Schema Changes

Ideas now include:
```typescript
interface DbIdea {
  // ... existing fields
  effort: number | null;  // 1-3 scale
  impact: number | null;  // 1-3 scale
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
}
```

### API Methods

```typescript
// Evaluate and select next idea
POST /api/ideas/vibeman
{
  action: 'evaluate-and-select',
  projectId: string,
  projectPath: string
}

// Implement specific idea
POST /api/ideas/vibeman
{
  action: 'implement-idea',
  projectId: string,
  projectPath: string,
  ideaId: string
}

// Get automation status
POST /api/ideas/vibeman
{
  action: 'get-status',
  projectId: string
}
```

### State Management

The automation uses React hooks for state:
- `isRunning`: Whether automation is active
- `status`: Current operation status
- `message`: User-facing status message
- `successCount`: Successful implementations
- `failureCount`: Failed implementations
- `isProcessing`: Whether currently processing an idea

## Performance Considerations

### Bottlenecks

1. **LLM Evaluation**: ~5-10 seconds per evaluation
2. **Requirement Generation**: ~1-2 seconds
3. **Claude Code Execution**: Variable (1-10+ minutes per task)
4. **Task Polling**: 5-second intervals

### Optimization Tips

1. Keep idea descriptions concise but clear
2. Ensure effort/impact ratings are accurate
3. Limit number of open goals (reduces LLM context)
4. Use faster Ollama models for evaluation
5. Monitor and clear completed tasks regularly

## Security & Safety

### Safety Measures

1. **Automatic Rollback**: Failed implementations don't corrupt state
2. **Manual Stop**: User can halt automation anytime
3. **Timeout Protection**: Prevents runaway processes
4. **Error Isolation**: One failure doesn't stop the system

### Best Practices

1. **Start Small**: Test with a few ideas first
2. **Monitor Initially**: Watch the first few implementations
3. **Review Code**: Check implemented changes periodically
4. **Backup Project**: Ensure code is version-controlled
5. **Set Expectations**: Understand that not all implementations will be perfect

---

**Note:** This is an experimental feature. While it has robust error handling, it's recommended to use it in projects with proper version control and to review the implemented changes regularly.
