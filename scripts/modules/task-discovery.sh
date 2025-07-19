#!/bin/bash
# task-discovery.sh - Task discovery functions for Claude watcher

# Source logging functions
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

# Task discovery functions
find_new_tasks() {
    local project="$1"
    local tasks_dir="$project/.claude-tasks"
    
    if [[ ! -d "$tasks_dir" ]]; then
        mkdir -p "$tasks_dir"
        return 1
    fi
    
    local json_files=("$tasks_dir"/*.json)
    if [[ ! -e "${json_files[0]}" ]]; then
        debug "📭 No .json files found in $tasks_dir"
        return 1
    fi
    
    debug "📁 Found ${#json_files[@]} .json files in $tasks_dir"
    
    # Check each file for processing status
    for task_file in "${json_files[@]}"; do
        local basename_task=$(basename "$task_file")
        debug "🔍 Examining file: $basename_task"
        
        # Check status files
        if [[ -f "$task_file.processing" ]]; then
            debug "⏳ Skipping processing task: $basename_task"
            continue
        fi
        if [[ -f "$task_file.completed" ]]; then
            debug "✅ Skipping completed task: $basename_task"
            continue
        fi
        if [[ -f "$task_file.failed" ]]; then
            debug "❌ Skipping failed task: $basename_task"
            continue
        fi
        
        # Found a new task
        echo "$task_file"
        return 0
    done
    
    return 1
} 