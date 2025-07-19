# Claude Watcher Cleanup & Naming Improvements

## Issues Resolved

### 1. **Empty Error Logs Cleanup** ✅
**Problem**: `claude_error.log` files were left behind even when tasks succeeded
**Solution**: Automatic cleanup of empty error logs after successful execution
- Empty error logs are removed automatically
- Non-empty error logs are preserved for debugging
- Cleanup happens during task completion

### 2. **Terminal Reactivity** ✅
**Problem**: Terminal didn't show feedback about completed tasks
**Solution**: Enhanced terminal sync checking
- Periodic scan for completed tasks
- Debug logging shows completed task status
- Better feedback in verbose mode

### 3. **Malformed Status Files** ✅
**Problem**: Status files contained malformed JSON with log data mixed in
**Solution**: Proper JSON formatting with validation
- Duration stored as numbers, not strings
- Clean JSON structure without log contamination
- Fallback handling when jq fails

### 4. **Task Naming Convention** ✅
**Problem**: Cryptic task names like `task-req-1752941506052-kwuxlau1j-1752941506057.json`
**Solution**: Human-readable naming: `req-MMDD-shorttitle.json`

## New Features

### Enhanced Task Naming
```
Old: task-req-1752941506052-kwuxlau1j-1752941506057.json
New: req-0719-testhelloworld.json
```

**Format**: `req-MMDD-shorttitle.json`
- **MM**: Month (01-12)
- **DD**: Day (01-31)  
- **shorttitle**: Title in lowercase, alphanumeric only, max 20 chars

### Smart Artifact Cleanup
```bash
# Files removed after successful completion:
- prompt.txt (temporary file)
- claude_error.log (if empty)

# Files preserved:
- claude_output.json (results)
- claude_error.log (if contains errors)
- original_task.json (archived)
```

### Enhanced Status Files
```json
// Completion status (proper JSON)
{
  "status": "completed",
  "completedAt": "2025-07-19T19:02:49+02:00",
  "duration": 181,
  "outputPath": "/path/to/work_dir",
  "taskFile": "req-0719-helloworld.json"
}
```

### Terminal Sync Monitoring
- Automatic detection of completed tasks
- Enhanced feedback in verbose mode
- Better progress tracking

## UI Improvements

### CursorReqCreator.tsx
Added real-time preview of task filename:
```
💾 Task will be saved as: req-0719-testhelloworld.json
```

Shows how the task will be named based on current title input.

## Technical Implementation

### File Structure Changes
```
.claude-tasks/
├── req-0719-helloworld.json           # Clean naming
├── req-0719-helloworld.json.completed # Proper JSON status
└── work_req-0719-helloworld/          # Work directory
    ├── claude_output.json             # Preserved
    ├── original_task.json             # Archived
    └── [no temp files]                # Cleaned up
```

### Code Changes

#### FileSystemInterface.ts
- Added `generateTaskFilename()` method
- Extracts title from prompt
- Creates clean, readable filenames

#### task-status.sh
- Fixed JSON formatting issues
- Added duration validation  
- Implemented `cleanup_successful_artifacts()`
- Added `check_terminal_sync()`

#### claude-execution.sh
- Proper duration return (numbers only)
- Enhanced error detection
- Better logging for empty vs. non-empty errors

#### claude-watcher.sh
- Added terminal sync checking
- Removed redundant cleanup
- Enhanced feedback loop

## Benefits

### User Experience
- **Readable task names** - Easy to identify tasks at a glance
- **Clean workspace** - No leftover temporary files
- **Better feedback** - Clear status updates in terminal
- **Predictable naming** - Consistent date-based organization

### System Efficiency
- **Reduced disk usage** - Automatic cleanup of temporary files
- **Better organization** - Date-based task grouping
- **Improved monitoring** - Enhanced sync detection
- **Cleaner logs** - Proper JSON formatting

### Developer Experience
- **Easy debugging** - Preserved error logs when needed
- **Clear structure** - Intuitive file organization
- **Better tooling** - Proper JSON for parsing/analysis

## Migration Guide

### Automatic Migration
The improvements are backward compatible:
- Existing tasks continue to work
- Old naming convention still supported
- New features apply to new tasks only

### Testing the Improvements
```bash
# Run the cleanup test suite
cd vibe/scripts
chmod +x test-cleanup-improvements.sh
./test-cleanup-improvements.sh
```

### Manual Cleanup (Optional)
```bash
# Clean up old temporary files
find .claude-tasks -name "*.processing" -empty -delete
find .claude-tasks -name "claude_error.log" -empty -delete
find .claude-tasks -name "prompt.txt" -delete
```

## Examples

### Before Improvements
```
.claude-tasks/
├── task-req-1752941506052-kwuxlau1j-1752941506057.json
├── task-req-1752941506052-kwuxlau1j-1752941506057.json.completed
│   └── [malformed JSON with log data]
└── work_task-req-1752941506052-kwuxlau1j-1752941506057/
    ├── claude_output.json
    ├── claude_error.log (empty but not removed)
    └── prompt.txt (leftover temporary file)
```

### After Improvements
```
.claude-tasks/
├── req-0719-helloworld.json
├── req-0719-helloworld.json.completed
│   └── [clean JSON: {"status": "completed", "duration": 181, ...}]
└── work_req-0719-helloworld/
    ├── claude_output.json
    └── original_task.json
    # [temp files automatically cleaned up]
```

## Configuration

### Enable Enhanced Features
```bash
# In claude-watcher.sh
ENABLE_PERFORMANCE_METRICS=1  # Enables cleanup monitoring
CLEANUP_OLD_TASKS_DAYS=3      # Auto-cleanup after 3 days
VERBOSE=1                     # See detailed sync feedback
```

### CursorReqCreator Settings
The task name preview updates automatically as you type the title, showing exactly how the file will be named.

## Troubleshooting

### Issues and Solutions

**Problem**: Task names too long
**Solution**: Titles are automatically truncated to 20 characters

**Problem**: Special characters in task names  
**Solution**: Only alphanumeric characters are kept, others removed

**Problem**: Empty status files
**Solution**: Fallback JSON creation when jq fails

**Problem**: Leftover temporary files
**Solution**: Automatic cleanup after successful completion

The improvements maintain full backward compatibility while providing a much cleaner, more organized experience for managing Claude tasks. 