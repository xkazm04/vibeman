set -e

# Optimized Configuration
MONITORED_PROJECTS=(
    "/mnt/c/Users/kazda/mk/simple"
    "/mnt/c/Users/kazda/mk/vibe"
)

BRAIN_PROJECT_ROOT="/mnt/c/Users/kazda/mk/vibe"
WATCH_INTERVAL=3  # Reduced from 5 for faster response
LOG_FILE="$BRAIN_PROJECT_ROOT/logs/claude-watcher.log"
PID_FILE="$BRAIN_PROJECT_ROOT/logs/claude-watcher.pid"
VERBOSE=0

# Optimization settings
PROMPT_TYPE="smart"  # Options: minimal, focused, optimized, smart
MAX_CONCURRENT_JOBS=3  # Increased from 2
ENABLE_PERFORMANCE_METRICS=1
CLEANUP_OLD_TASKS_DAYS=3  # Auto-cleanup after 3 days

# Source core functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/watcher-core.sh"

# Initialize logging with verbose support
export VERBOSE LOG_FILE
setup_logging "$LOG_FILE"

# Process a single task (simplified)
process_task() {
    local task_file="$1"
    local target_project="$2"
    local task_name=$(basename "$task_file" .json)
    
    log "🚀 Processing task: $task_name in $(basename "$target_project")"
    
    # Validate task file
    if ! validate_task_file "$task_file"; then
        mark_task_failed "$task_file" "Invalid task file" "0"
        return 1
    fi
    
    # Extract task data
    local task_content=$(cat "$task_file")
    local requirement_id=$(echo "$task_content" | jq -r '.requirementId')
    local project_path=$(echo "$task_content" | jq -r '.projectPath // "'"$target_project"'"')
    
    # Setup work environment
    local work_dir="$target_project/.claude-tasks/work_$task_name"
    mkdir -p "$work_dir"
    
    # Create optimized prompt based on configuration
    local prompt_file="$work_dir/prompt.txt"
    case "$PROMPT_TYPE" in
        "smart")
            create_smart_prompt "$task_content" "$requirement_id" > "$prompt_file"
            debug "   🧠 Using smart prompt optimization"
            ;;
        "minimal")
            create_minimal_prompt "$task_content" "$requirement_id" > "$prompt_file"
            debug "   ⚡ Using minimal prompt"
            ;;
        "optimized")
            create_optimized_prompt "$task_content" "$requirement_id" > "$prompt_file"
            debug "   🚀 Using optimized prompt with caching"
            ;;
        *)
            create_focused_prompt "$task_content" "$requirement_id" > "$prompt_file"
            debug "   🎯 Using focused prompt"
            ;;
    esac
    
    # Execute Claude with optimized parameters
    local duration
    if duration=$(execute_claude_task "$prompt_file" "$work_dir" "$project_path" "$PROMPT_TYPE"); then
        mark_task_completed "$task_file" "$work_dir" "$duration"
    else
        mark_task_failed "$task_file" "Claude execution failed" "$duration"
    fi
    
    # Change back to brain project root
    cd "$BRAIN_PROJECT_ROOT"
    
    log "🏁 Finished processing task: $task_name"
}

# Main watch loop (simplified)
watch_projects() {
    log "🔍 Starting simplified multi-project watcher"
    log "Monitored projects: ${#MONITORED_PROJECTS[@]}"
    
    while true; do
        debug "Checking for new tasks..."
        
        # Check terminal sync and report completed tasks
        for project in "${MONITORED_PROJECTS[@]}"; do
            if [[ -d "$project" ]]; then
                check_terminal_sync "$project"
            fi
        done
        
        # Periodic cleanup of old task files
        if [[ $ENABLE_PERFORMANCE_METRICS -eq 1 ]] && (($(date +%s) % 3600 == 0)); then
            debug "🧹 Running periodic cleanup..."
            for project in "${MONITORED_PROJECTS[@]}"; do
                if [[ -d "$project/.claude-tasks" ]]; then
                    cleanup_old_status_files "$project/.claude-tasks" "$CLEANUP_OLD_TASKS_DAYS"
                fi
            done
        fi
        
        for project in "${MONITORED_PROJECTS[@]}"; do
            if [[ ! -d "$project" ]]; then
                continue
            fi
            
            # Find and process new tasks
            if new_task=$(find_new_tasks "$project"); then
                log "🆕 Found task: $(basename "$new_task") in $(basename "$project")"
                
                # Create processing marker immediately
                create_processing_marker "$new_task"
                
                # Process in background with proper logging
                {
                    sleep 1  # Ensure processing marker is created
                    export VERBOSE LOG_FILE  # Ensure background process has logging vars
                    process_task "$new_task" "$project" 2>&1 | while read line; do
                        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$LOG_FILE"
                    done
                } &
                
                # Optimized concurrent job management
                local job_count=$(jobs -r | wc -l)
                if [[ $job_count -ge $MAX_CONCURRENT_JOBS ]]; then
                    log "⏳ Waiting for jobs to complete (${job_count}/${MAX_CONCURRENT_JOBS})..."
                    wait -n
                fi
            fi
        done
        
        sleep "$WATCH_INTERVAL"
    done
}

# Status and control functions
show_status() {
    echo "=== Modular Claude Watcher Status ==="
    echo "PID: $(cat "$PID_FILE" 2>/dev/null || echo "Not running")"
    echo "Projects: ${#MONITORED_PROJECTS[@]}"
    
    for project in "${MONITORED_PROJECTS[@]}"; do
        local name=$(basename "$project")
        local tasks_dir="$project/.claude-tasks"
        
        if [[ -d "$tasks_dir" ]]; then
            local pending=$(find "$tasks_dir" -name "*.json" -not -name "*.processing" -not -name "*.completed" -not -name "*.failed" 2>/dev/null | wc -l)
            local processing=$(find "$tasks_dir" -name "*.processing" 2>/dev/null | wc -l)
            local completed=$(find "$tasks_dir" -name "*.completed" 2>/dev/null | wc -l)
            local failed=$(find "$tasks_dir" -name "*.failed" 2>/dev/null | wc -l)
            
            echo "📁 $name: P:$pending | R:$processing | ✓:$completed | ✗:$failed"
        fi
    done
}

test_configuration() {
    echo "🧪 Testing Modular Watcher Configuration"
    echo "========================================"
    
    for project in "${MONITORED_PROJECTS[@]}"; do
        echo -n "📁 $(basename "$project"): "
        if [[ -d "$project" ]]; then
            echo "✅ EXISTS"
            
            if [[ -d "$project/.claude-tasks" ]]; then
                local task_count=$(find "$project/.claude-tasks" -name "*.json" 2>/dev/null | wc -l)
                echo "   Tasks: $task_count files"
            else
                echo "   Tasks: Creating directory..."
                mkdir -p "$project/.claude-tasks"
            fi
        else
            echo "❌ NOT FOUND"
        fi
    done
    
    if command -v claude &> /dev/null; then
                    echo "✅ Claude CLI: $(claude --version)"
        else
            echo "❌ Claude CLI: NOT FOUND"
        fi
        
        echo ""
        echo "🚀 Optimization Settings:"
        echo "   Prompt Type: $PROMPT_TYPE"
        echo "   Max Concurrent: $MAX_CONCURRENT_JOBS"
        echo "   Watch Interval: ${WATCH_INTERVAL}s"
        echo "   Performance Metrics: $([[ $ENABLE_PERFORMANCE_METRICS -eq 1 ]] && echo "ON" || echo "OFF")"
        echo "   Cleanup After: ${CLEANUP_OLD_TASKS_DAYS} days"
}

# Cleanup
cleanup() {
    log "Shutting down modular watcher..."
    pkill -f "claude -p" 2>/dev/null || true
    wait
    rm -f "$PID_FILE"
    log "Watcher stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Argument parsing
parse_args() {
    local command=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose) VERBOSE=1; shift ;;
            start|stop|restart|status|test|help) command="$1"; shift ;;
            *) echo "Unknown option: $1"; command="help"; break ;;
        esac
    done
    echo "${command:-start}"
}

# Main execution
main() {
    local command=$(parse_args "$@")
    
    case "$command" in
        "start")
            if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
                echo "Watcher already running (PID: $(cat "$PID_FILE"))"
                exit 1
            fi
            
            # Check dependencies first
            if ! check_dependencies; then
                error "Dependencies check failed. Please fix and try again."
                exit 1
            fi
            
            echo $$ > "$PID_FILE"
            log "=== Modular Claude Watcher Starting (PID: $$) ==="
            
            if ! claude config list &>/dev/null; then
                error "Claude not authenticated. Run: claude auth login"
                exit 1
            fi
            
            watch_projects
            ;;
        "test") test_configuration ;;
        "status") show_status ;;
        "stop")
            if [[ -f "$PID_FILE" ]]; then
                local pid=$(cat "$PID_FILE")
                if kill "$pid" 2>/dev/null; then
                    echo "Stopped watcher (PID: $pid)"
                else
                    echo "Watcher not running"
                fi
                rm -f "$PID_FILE"
            fi
            ;;
        "restart") $0 stop; sleep 2; $0 start $([ $VERBOSE -eq 1 ] && echo "-v") ;;
        *) 
            echo "Modular Claude Code Watcher"
            echo "Usage: $0 [start|stop|restart|status|test] [-v]"
            echo "Options: -v (verbose mode)"
            ;;
    esac
}

main "$@"