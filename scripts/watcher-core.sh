#!/bin/bash
# watcher-core.sh - Modular core functions for Claude watcher

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="$SCRIPT_DIR/modules"

# Source all modules in dependency order
source "$MODULES_DIR/logging.sh"
source "$MODULES_DIR/dependencies.sh"
source "$MODULES_DIR/task-validation.sh"
source "$MODULES_DIR/task-status.sh"
source "$MODULES_DIR/task-discovery.sh"
source "$MODULES_DIR/claude-execution.sh"

# Main initialization function
init_watcher() {
    local log_file="$1"
    local verbose="${2:-0}"
    
    # Export variables for use in modules
    export LOG_FILE="$log_file"
    export VERBOSE="$verbose"
    
    # Setup logging
    setup_logging "$log_file"
    
    # Check dependencies
    if ! check_dependencies; then
        error "Failed to initialize watcher due to missing dependencies"
        return 1
    fi
    
    log "✅ Claude watcher core initialized"
    return 0
}

# Export all functions for use in other scripts
export -f setup_logging log success error warning debug
export -f check_dependencies
export -f validate_task_file
export -f create_processing_marker mark_task_completed mark_task_failed get_task_status cleanup_old_status_files cleanup_successful_artifacts check_terminal_sync
export -f find_new_tasks
export -f create_focused_prompt create_optimized_prompt create_minimal_prompt create_smart_prompt execute_claude_task validate_claude_environment create_debug_prompt
export -f init_watcher 