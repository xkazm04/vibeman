#!/bin/bash
# task-validation.sh - Task validation functions for Claude watcher

# Source logging functions
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"
source "$(dirname "${BASH_SOURCE[0]}")/dependencies.sh"

# Task validation functions
validate_task_file() {
    local task_file="$1"
    
    if [[ ! -f "$task_file" ]]; then
        error "Task file does not exist: $task_file"
        return 1
    fi
    
    if [[ ! -r "$task_file" ]]; then
        error "Task file is not readable: $task_file"
        return 1
    fi
    
    local file_size=$(wc -c < "$task_file")
    if [[ $file_size -eq 0 ]]; then
        error "Task file is empty: $task_file"
        return 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        error "jq command not found. Installing..."
        if ! check_dependencies; then
            return 1
        fi
    fi
    
    # Validate JSON
    local json_error
    json_error=$(jq empty "$task_file" 2>&1)
    if [[ $? -ne 0 ]]; then
        error "Invalid JSON in task file: $task_file"
        error "JSON error: $json_error"
        
        # Try to fix line endings
        if grep -q $'\r' "$task_file"; then
            warning "Converting Windows line endings..."
            tr -d '\r' < "$task_file" > "${task_file}.tmp" && mv "${task_file}.tmp" "$task_file"
            
            if jq empty "$task_file" 2>/dev/null; then
                log "✅ JSON validation successful after line ending conversion"
                return 0
            fi
        fi
        return 1
    fi
    
    debug "✅ JSON validation successful"
    return 0
} 