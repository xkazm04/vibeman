# Claude Watcher Modules

This directory contains the modularized components of the Claude watcher system, broken down into logical units for better maintainability and code organization.

## Module Structure

### Core Modules

1. **`logging.sh`** - Centralized logging functionality
   - Color-coded console output
   - File logging with timestamps
   - Multiple log levels (log, success, error, warning, debug)
   - Verbose mode support

2. **`dependencies.sh`** - Dependency management
   - Checks for required tools (claude, jq)
   - Automatic installation of missing dependencies
   - Error handling for dependency failures

3. **`task-validation.sh`** - Task file validation
   - File existence and readability checks
   - JSON validation with error handling
   - Windows line ending conversion
   - **FIXED**: Syntax error in line ending detection

4. **`task-status.sh`** - Task lifecycle management
   - Processing markers
   - Completion status tracking
   - Failure tracking with error messages
   - Fallback for when jq is unavailable

5. **`task-discovery.sh`** - Task discovery and filtering
   - Scans for new task files
   - Filters out already processed tasks
   - Status-aware task selection

6. **`claude-execution.sh`** - Claude CLI interaction
   - Focused prompt generation
   - Task execution with timeout
   - Result parsing and logging
   - Error handling and reporting

## Usage

### Basic Usage
```bash
# Source the main module
source "path/to/watcher-core-new.sh"

# Initialize the watcher
init_watcher "/path/to/logfile.log" 1  # 1 for verbose mode

# Use individual functions
find_new_tasks "/path/to/project"
validate_task_file "/path/to/task.json"
```

### Integration
The new modular structure is backward compatible. Replace the old `watcher-core.sh` with `watcher-core-new.sh` and all existing functionality will work.

## Key Improvements

1. **Fixed Syntax Error**: Corrected incomplete `if grep -q` statement in task validation
2. **Modular Design**: Separated concerns into logical modules
3. **Better Dependencies**: Modules only source what they need
4. **Enhanced Error Handling**: Better fallbacks when dependencies are missing
5. **Cleaner Code**: Each module has a single responsibility
6. **Easier Testing**: Individual modules can be tested in isolation
7. **Better Maintainability**: Changes to one area don't affect others

## Dependencies Between Modules

```
logging.sh (base)
├── dependencies.sh
├── task-status.sh
├── task-discovery.sh
├── claude-execution.sh
└── task-validation.sh
    └── dependencies.sh
```

## Migration

To migrate from the old monolithic file:

1. Backup the original `watcher-core.sh`
2. Replace it with `watcher-core-new.sh`
3. Ensure the `modules/` directory is in place
4. Test with your existing scripts

The API remains the same, so no changes to calling scripts are required. 