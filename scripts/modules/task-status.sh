#!/bin/bash
# task-status.sh - Enhanced task status management for Claude watcher

# Source logging functions
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

# Task status management with enhanced logging and cleanup
create_processing_marker() {
    local task_file="$1"
    local processing_file="${task_file}.processing"
    
    debug "🏷️ Creating processing marker for $(basename "$task_file")"
    
    # Create processing marker with timestamp and metadata
    cat << EOF > "$processing_file"
{
  "status": "processing",
  "startedAt": "$(date -Iseconds)",
  "pid": "$$",
  "taskFile": "$(basename "$task_file")"
}
EOF
    
    if [[ -f "$processing_file" ]]; then
        debug "✅ Processing marker created: $processing_file"
        return 0
    else
        error "❌ Failed to create processing marker: $processing_file"
        return 1
    fi
}

mark_task_completed() {
    local task_file="$1"
    local work_dir="$2"
    local duration="$3"
    
    debug "📝 Marking task as completed: $(basename "$task_file")"
    debug "   Work directory: $work_dir"
    debug "   Duration: ${duration}s"
    
    # Validate duration is a number
    if ! [[ "$duration" =~ ^[0-9]+$ ]]; then
        warning "Invalid duration value: $duration, using 0"
        duration="0"
    fi
    
    # Create detailed completion marker with proper JSON
    if command -v jq &> /dev/null; then
        local task_content=$(cat "$task_file" 2>/dev/null || echo '{}')
        
        if echo "$task_content" | jq --arg output "$work_dir" --arg completed "$(date -Iseconds)" --argjson duration "$duration" \
            '.status = "completed" | .completedAt = $completed | .outputPath = $output | .duration = $duration' > "$task_file.completed" 2>/dev/null; then
            
            success "✅ Task marked as completed: $task_file.completed"
            debug "   📄 Completion file size: $(wc -c < "$task_file.completed") bytes"
        else
            warning "jq failed, using fallback completion format"
            create_simple_completion "$task_file" "$work_dir" "$duration"
        fi
    else
        warning "jq not available, creating simple completion marker"
        create_simple_completion "$task_file" "$work_dir" "$duration"
    fi
    
    # Archive original task
    if mv "$task_file" "$work_dir/original_task.json" 2>/dev/null; then
        debug "   📦 Original task archived to: $work_dir/original_task.json"
    else
        warning "   ⚠️ Failed to archive original task file"
    fi
    
    # Remove processing marker
    if rm -f "$task_file.processing"; then
        debug "   🗑️ Processing marker removed"
    fi
    
    # Cleanup successful artifacts
    cleanup_successful_artifacts "$work_dir"
    
    return 0
}

create_simple_completion() {
    local task_file="$1"
    local work_dir="$2"
    local duration="$3"
    
    cat << EOF > "$task_file.completed"
{
  "status": "completed",
  "completedAt": "$(date -Iseconds)",
  "duration": $duration,
  "outputPath": "$work_dir",
  "taskFile": "$(basename "$task_file")"
}
EOF
    
    success "✅ Task marked as completed (simple format): $task_file.completed"
}

mark_task_failed() {
    local task_file="$1"
    local error_msg="$2"
    local duration="$3"
    
    debug "📝 Marking task as failed: $(basename "$task_file")"
    debug "   Error: $error_msg"
    debug "   Duration: ${duration}s"
    
    # Validate duration is a number
    if ! [[ "$duration" =~ ^[0-9]+$ ]]; then
        warning "Invalid duration value: $duration, using 0"
        duration="0"
    fi
    
    # Create detailed failure marker
    if command -v jq &> /dev/null; then
        local task_content=$(cat "$task_file" 2>/dev/null || echo '{}')
        
        if echo "$task_content" | jq --arg error "$error_msg" --arg failed "$(date -Iseconds)" --argjson duration "$duration" \
            '.status = "failed" | .error = $error | .failedAt = $failed | .duration = $duration' > "$task_file.failed" 2>/dev/null; then
            
            error "❌ Task marked as failed: $task_file.failed"
            debug "   📄 Failure file size: $(wc -c < "$task_file.failed") bytes"
        else
            warning "jq failed, using fallback failure format"
            create_simple_failure "$task_file" "$error_msg" "$duration"
        fi
    else
        warning "jq not available, creating simple failure marker"
        create_simple_failure "$task_file" "$error_msg" "$duration"
    fi
    
    # Remove processing marker
    if rm -f "$task_file.processing"; then
        debug "   🗑️ Processing marker removed"
    fi
    
    error "❌ Task failed: $(basename "$task_file") - $error_msg"
    return 0
}

create_simple_failure() {
    local task_file="$1"
    local error_msg="$2"
    local duration="$3"
    
    cat << EOF > "$task_file.failed"
{
  "status": "failed",
  "error": "$error_msg",
  "failedAt": "$(date -Iseconds)",
  "duration": $duration,
  "taskFile": "$(basename "$task_file")"
}
EOF
    
    error "❌ Task marked as failed (simple format): $task_file.failed"
}

# Enhanced status checking
get_task_status() {
    local task_file="$1"
    
    if [[ -f "$task_file.processing" ]]; then
        echo "processing"
    elif [[ -f "$task_file.completed" ]]; then
        echo "completed"
    elif [[ -f "$task_file.failed" ]]; then
        echo "failed"
    else
        echo "pending"
    fi
}

# Cleanup successful artifacts
cleanup_successful_artifacts() {
    local work_dir="$1"
    
    debug "🧹 Cleaning up successful task artifacts in: $work_dir"
    
    # Remove empty error logs from successful runs
    local error_log="$work_dir/claude_error.log"
    if [[ -f "$error_log" ]]; then
        if [[ ! -s "$error_log" ]]; then
            debug "   🗑️ Removing empty error log: $error_log"
            rm -f "$error_log"
        else
            debug "   📄 Keeping non-empty error log: $error_log ($(wc -c < "$error_log") bytes)"
        fi
    fi
    
    # Remove temporary prompt file
    local prompt_file="$work_dir/prompt.txt"
    if [[ -f "$prompt_file" ]]; then
        debug "   🗑️ Removing temporary prompt file: $prompt_file"
        rm -f "$prompt_file"
    fi
    
    debug "✅ Artifact cleanup completed"
}

# Status file cleanup
cleanup_old_status_files() {
    local tasks_dir="$1"
    local days_old="${2:-7}"
    
    debug "🧹 Cleaning up status files older than $days_old days in $tasks_dir"
    
    if [[ -d "$tasks_dir" ]]; then
        find "$tasks_dir" -name "*.processing" -o -name "*.completed" -o -name "*.failed" -mtime +$days_old -delete 2>/dev/null || true
        debug "✅ Cleanup completed"
    fi
}

# Check for completed tasks that terminal hasn't reacted to
check_terminal_sync() {
    local project="$1"
    local tasks_dir="$project/.claude-tasks"
    
    if [[ ! -d "$tasks_dir" ]]; then
        return 0
    fi
    
    # Count completed tasks without terminal reaction
    local completed_files=("$tasks_dir"/*.completed)
    if [[ -e "${completed_files[0]}" ]]; then
        local count=${#completed_files[@]}
        if [[ $count -gt 0 ]]; then
            debug "📋 Found $count completed tasks in $(basename "$project")"
            for completed_file in "${completed_files[@]}"; do
                local task_name=$(basename "$completed_file" .completed)
                debug "   ✅ Completed: $task_name"
            done
        fi
    fi
} 