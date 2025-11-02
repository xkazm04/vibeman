# Task Execution Process Flow

Based on comprehensive codebase analysis, here's the breakdown of the task execution process:

## Process Steps

| # | Step Name | Required | Key Artifact | Filepath |
|---|-----------|----------|--------------|----------|
| 1 | Batch Creation | true | - | src/app/features/TaskRunner/TaskRunnerHeader.tsx:160-185 |
| 2 | Queue Initialization | true | - | src/app/features/TaskRunner/TaskRunnerHeader.tsx:187-227 |
| 3 | Requirements Status Update | true | - | src/app/features/TaskRunner/TaskRunnerHeader.tsx:214-222 |
| 4 | Execution Queue Reference | true | - | src/app/features/TaskRunner/TaskRunnerHeader.tsx:210-211 |
| 5 | API Health Check | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:84-98 |
| 6 | Create Task API Call | true | - | src/app/Claude/lib/requirementApi.ts:35-84 |
| 7 | Queue Task in Backend | true | - | src/app/api/claude-code/route.ts:211-228 |
| 8 | Add to Execution Queue | true | - | src/app/Claude/lib/claudeExecutionQueue.ts:30-60 |
| 9 | Process Queue | true | - | src/app/Claude/lib/claudeExecutionQueue.ts:106-216 |
| 10 | Read Requirement File | true | .claude/commands/<requirement>.md | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:34-40 |
| 11 | Build Execution Prompt | true | Prompt Template | src/app/Claude/sub_ClaudeCodeManager/executionPrompt.ts:16-168 |
| 12 | Write Temp Prompt File | true | .claude/logs/prompt_<timestamp>.txt | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:95-96 |
| 13 | Prepare Claude CLI Command | true | - | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:107-121 |
| 14 | Spawn Claude CLI Process | true | - | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:123-132 |
| 15 | Stream Output to Log | true | .claude/logs/<requirement>_<timestamp>.log | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:138-149 |
| 16 | Status Polling (Frontend) | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:157-370 |
| 17 | Get Task Status API | true | - | src/app/api/claude-code/route.ts:271-400 |
| 18 | Detect Process Completion | true | - | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:152-189 |
| 19 | Session Limit Detection | true | - | src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:166-174 |
| 20 | Update Implementation Log | false | database/goals.db:implementation_log table | Executed by Claude CLI (instructed in prompt) |
| 21 | Update Context Documentation | false | contexts/<feature>/.context files | Executed by Claude CLI (instructed in prompt) |
| 22 | Git Configuration Check | false | localStorage:taskRunner_gitConfig | src/app/features/TaskRunner/lib/taskExecutor.ts:193-208 |
| 23 | Generate Commit Message | false | Git message template | src/app/features/TaskRunner/sub_Git/gitApi.ts:35-43 |
| 24 | Execute Git Operations | false | - | src/app/features/TaskRunner/sub_Git/gitApi.ts:6-30 |
| 25 | Git Commit & Push API | false | - | src/app/api/git/commit-and-push/route.ts |
| 26 | Update Idea Status | false | database/goals.db:ideas table | src/app/features/TaskRunner/lib/taskExecutor.ts:245-261 |
| 27 | Idea Status API Call | false | - | src/app/api/ideas/update-implementation-status/route.ts |
| 28 | Delete Requirement File | true | .claude/commands/<requirement>.md | src/app/features/TaskRunner/lib/taskExecutor.ts:313 |
| 29 | Update Batch Progress | true | localStorage:taskRunner_batchState | src/app/features/TaskRunner/lib/taskExecutor.ts:316 |
| 30 | Calculate Batch Progress | true | - | src/app/features/TaskRunner/lib/batchStorage.ts:30-72 |
| 31 | Remove from UI State | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:319-326 |
| 32 | Wait for Next.js Rebuild | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:330-332 |
| 33 | Trigger Next Task | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:291-297 |
| 34 | Error Handling & Retry | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:107-135 |
| 35 | Polling Error Recovery | true | - | src/app/features/TaskRunner/lib/taskExecutor.ts:333-368 |
| 36 | Cleanup Temp Files | false | .claude/logs/prompt_*.txt | Manual or periodic cleanup |

## Key Configuration Files & Artifacts

1. **Execution Prompt Template**: `src/app/Claude/sub_ClaudeCodeManager/executionPrompt.ts:16-168`
2. **Requirement Files**: `.claude/commands/<requirement-name>.md`
3. **Log Files**: `.claude/logs/<requirement>_<timestamp>.log`
4. **Batch State**: `localStorage:taskRunner_batchState`
5. **Git Configuration**: `localStorage:taskRunner_gitConfig`
6. **Implementation Log DB**: `database/goals.db` (table: `implementation_log`)
7. **Ideas DB**: `database/goals.db` (table: `ideas`)
8. **Context Files**: `contexts/<feature>/.context`