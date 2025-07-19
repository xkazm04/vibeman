#!/bin/bash
# claude-execution.sh - Enhanced Claude execution functions for Claude watcher

# Source logging functions
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

# Optimized prompt creation functions
create_focused_prompt() {
    local task_content="$1"
    local requirement_id="$2"
    
    debug "🎯 Creating minimal focused prompt for requirement: $requirement_id"
    
    # Safe extraction without jq dependency
    local prompt context_files
    
    if command -v jq &> /dev/null; then
        prompt=$(echo "$task_content" | jq -r '.prompt' 2>/dev/null || echo "No prompt found")
        context_files=$(echo "$task_content" | jq -r '.context[]? // empty' 2>/dev/null | tr '\n' ' ')
        debug "   📝 Extracted prompt length: ${#prompt} characters"
        debug "   📁 Context files: $context_files"
    else
        # Fallback parsing (basic)
        prompt=$(echo "$task_content" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4 | head -1)
        context_files="src/page.tsx" # Default fallback
        warning "   ⚠️ jq not available, using fallback parsing"
    fi
    
    # Minimal, targeted prompt for better performance
    cat << EOF
# MINIMAL Task - $requirement_id
$prompt

## Constraints
- Target files only: $context_files
- Minimal changes
- Skip exploration
EOF
}

# New optimized prompt with cacheable prefix
create_optimized_prompt() {
    local task_content="$1"
    local requirement_id="$2"
    
    debug "🚀 Creating optimized prompt with cacheable prefix for: $requirement_id"
    
    # Safe extraction without jq dependency
    local prompt context_files
    
    if command -v jq &> /dev/null; then
        prompt=$(echo "$task_content" | jq -r '.prompt' 2>/dev/null || echo "No prompt found")
        context_files=$(echo "$task_content" | jq -r '.context[]? // empty' 2>/dev/null | tr '\n' ' ')
        debug "   📝 Extracted prompt length: ${#prompt} characters"
        debug "   📁 Context files: $context_files"
    else
        # Fallback parsing (basic)
        prompt=$(echo "$task_content" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4 | head -1)
        context_files="src/page.tsx" # Default fallback
        warning "   ⚠️ jq not available, using fallback parsing"
    fi
    
    # Use consistent, cacheable prefix for better performance
    cat << EOF
# Standard Development Context
Tech: React/TypeScript/Tailwind
Approach: Minimal targeted changes
Guidelines: TypeScript compliance, efficient implementation

## Specific Task: $requirement_id
$prompt

## Target: $context_files
EOF
}

# Ultra-minimal prompt for simple tasks
create_minimal_prompt() {
    local task_content="$1"
    local requirement_id="$2"
    
    debug "⚡ Creating ultra-minimal prompt for: $requirement_id"
    
    local prompt context_files
    
    if command -v jq &> /dev/null; then
        prompt=$(echo "$task_content" | jq -r '.prompt' 2>/dev/null || echo "No prompt found")
        context_files=$(echo "$task_content" | jq -r '.context[]? // empty' 2>/dev/null | tr '\n' ' ')
    else
        prompt=$(echo "$task_content" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4 | head -1)
        context_files="src/page.tsx"
    fi
    
    # Extremely minimal for maximum efficiency
    cat << EOF
Task: $prompt
Files: $context_files
Mode: Minimal changes only
EOF
}

# Smart prompt selector based on task complexity
create_smart_prompt() {
    local task_content="$1"
    local requirement_id="$2"
    local complexity="${3:-auto}"
    
    debug "🧠 Creating smart prompt for: $requirement_id (complexity: $complexity)"
    
    local prompt context_files
    
    if command -v jq &> /dev/null; then
        prompt=$(echo "$task_content" | jq -r '.prompt' 2>/dev/null || echo "No prompt found")
        context_files=$(echo "$task_content" | jq -r '.context[]? // empty' 2>/dev/null | tr '\n' ' ')
        
        # Auto-detect complexity if not specified
        if [[ "$complexity" == "auto" ]]; then
            local prompt_length=${#prompt}
            local file_count=$(echo "$context_files" | wc -w)
            
            if [[ $prompt_length -lt 100 && $file_count -le 1 ]]; then
                complexity="minimal"
            elif [[ $prompt_length -lt 300 && $file_count -le 3 ]]; then
                complexity="focused"
            else
                complexity="optimized"
            fi
            
            debug "   🎯 Auto-detected complexity: $complexity (prompt: $prompt_length chars, files: $file_count)"
        fi
    else
        prompt=$(echo "$task_content" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4 | head -1)
        context_files="src/page.tsx"
        complexity="focused" # Safe default for fallback
    fi
    
    # Select appropriate prompt based on complexity
    case "$complexity" in
        "minimal")
            debug "   ⚡ Using ultra-minimal prompt"
            create_minimal_prompt "$task_content" "$requirement_id"
            ;;
        "optimized")
            debug "   🚀 Using optimized prompt with caching"
            create_optimized_prompt "$task_content" "$requirement_id"
            ;;
        *)
            debug "   🎯 Using focused minimal prompt"
            create_focused_prompt "$task_content" "$requirement_id"
            ;;
    esac
}

execute_claude_task() {
    local prompt_file="$1"
    local work_dir="$2"
    local project_path="$3"
    local prompt_type="${4:-smart}" # New parameter for prompt type
    
    log "🤖 Executing Claude Code in: $(basename "$project_path")..."
    debug "   📁 Work directory: $work_dir"
    debug "   📄 Prompt file: $prompt_file"
    debug "   🎯 Project path: $project_path"
    debug "   🧠 Prompt type: $prompt_type"
    
    # Validate inputs
    if [[ ! -f "$prompt_file" ]]; then
        error "❌ Prompt file does not exist: $prompt_file"
        echo "0"
        return 1
    fi
    
    if [[ ! -d "$project_path" ]]; then
        error "❌ Project path does not exist: $project_path"
        echo "0"
        return 1
    fi
    
    # Check Claude CLI availability
    if ! command -v claude &> /dev/null; then
        error "❌ Claude CLI not found"
        echo "0"
        return 1
    fi
    
    log "⏱️ Starting Claude execution (timeout: 30 minutes)..."
    debug "   📊 Current directory before cd: $(pwd)"
    
    cd "$project_path" || {
        error "❌ Failed to change to project directory: $project_path"
        echo "0"
        return 1
    }
    
    debug "   📊 Current directory after cd: $(pwd)"
    
    # Show prompt optimization info
    local prompt_size=$(wc -c < "$prompt_file")
    debug "   📄 Prompt size: $prompt_size bytes"
    debug "   📄 Prompt preview (first 100 chars): $(head -c 100 "$prompt_file")..."
    
    local claude_start_time=$(date +%s)
    local claude_output_file="$work_dir/claude_output.json"
    local claude_error_file="$work_dir/claude_error.log"
    
    # Ensure output directory exists
    mkdir -p "$work_dir"
    
    # Enhanced Claude execution with optimized parameters
    log "🚀 Launching Claude CLI with optimized prompt..."
    debug "   💻 Command: claude -p \"<$prompt_size bytes>\" --output-format json --dangerously-skip-permissions"
    
    # Use optimized Claude parameters for better performance
    if timeout 1800 claude -p "$(cat "$prompt_file")" \
        --output-format json \
        --dangerously-skip-permissions \
        --model claude-sonnet-4-20250514 \
        > "$claude_output_file" \
        2> "$claude_error_file"; then
        
        local claude_end_time=$(date +%s)
        local claude_duration=$((claude_end_time - claude_start_time))
        
        success "🎉 Claude Code completed successfully (${claude_duration}s)"
        debug "   ⏱️ Execution time: ${claude_duration} seconds"
        debug "   📊 Performance: $(echo "scale=2; $prompt_size / $claude_duration" | bc -l 2>/dev/null || echo "N/A") bytes/sec"
        
        # Enhanced result parsing and logging
        if [[ -f "$claude_output_file" && -s "$claude_output_file" ]]; then
            local file_size=$(wc -c < "$claude_output_file")
            debug "   📄 Output file size: $file_size bytes"
            
            if command -v jq &> /dev/null; then
                local claude_cost=$(jq -r '.total_cost_usd // "Unknown"' "$claude_output_file" 2>/dev/null)
                local claude_turns=$(jq -r '.num_turns // "Unknown"' "$claude_output_file" 2>/dev/null)
                local claude_result=$(jq -r '.result // "No result"' "$claude_output_file" 2>/dev/null)
                local claude_session=$(jq -r '.session_id // "Unknown"' "$claude_output_file" 2>/dev/null)
                
                log "📊 Claude Results:"
                log "  💰 Cost: \$${claude_cost}"
                log "  🔄 Turns: $claude_turns"
                log "  🆔 Session: ${claude_session:0:8}..."
                log "  📝 Result: ${claude_result:0:150}..."
                
                # Performance metrics
                if [[ "$claude_cost" != "Unknown" && "$claude_cost" != "null" ]]; then
                    local cost_per_second=$(echo "scale=6; $claude_cost / $claude_duration" | bc -l 2>/dev/null || echo "N/A")
                    debug "   💡 Cost efficiency: \$$cost_per_second/second"
                fi
                
                # Log full result in debug mode
                debug "   📝 Full result: $claude_result"
            else
                warning "   ⚠️ jq not available, cannot parse Claude output details"
                log "  📄 Raw output preview: $(head -c 200 "$claude_output_file")..."
            fi
        else
            warning "⚠️ Claude output file is empty or missing"
            if [[ -f "$claude_output_file" ]]; then
                debug "   📄 Output file exists but is empty"
            else
                debug "   📄 Output file does not exist"
            fi
        fi
        
        # Check error log even on success
        if [[ -f "$claude_error_file" && -s "$claude_error_file" ]]; then
            warning "⚠️ Claude produced warnings/errors:"
            debug "$(cat "$claude_error_file")"
        else
            debug "   ✅ No errors detected"
        fi
        
        # Return only the duration number for proper JSON formatting
        echo "$claude_duration"
        return 0
    else
        local claude_end_time=$(date +%s)
        local claude_duration=$((claude_end_time - claude_start_time))
        
        error "💥 Claude Code failed (${claude_duration}s)"
        debug "   ⏱️ Failed after: ${claude_duration} seconds"
        
        # Enhanced error reporting
        if [[ -f "$claude_error_file" && -s "$claude_error_file" ]]; then
            local error_size=$(wc -c < "$claude_error_file")
            error "📄 Error log size: $error_size bytes"
            
            local error_msg=$(head -3 "$claude_error_file" | tr '\n' ' ')
            error "Error preview: $error_msg"
            
            # Log full error in debug mode
            debug "   📝 Full error log:"
            debug "$(cat "$claude_error_file")"
        else
            error "❌ No error log generated or file is empty"
            debug "   📄 Error file exists: $(test -f "$claude_error_file" && echo "yes" || echo "no")"
            debug "   📄 Error file size: $(test -f "$claude_error_file" && wc -c < "$claude_error_file" || echo "N/A") bytes"
        fi
        
        # Check if timeout was the issue
        if [[ $claude_duration -ge 1800 ]]; then
            error "⏰ Claude execution timed out after 30 minutes"
        fi
        
        # Check for common issues
        if ! claude auth list &>/dev/null; then
            error "🔐 Claude authentication issue detected"
        fi
        
        echo "$claude_duration"
        return 1
    fi
}

# New function to validate Claude environment
validate_claude_environment() {
    debug "🔍 Validating Claude environment..."
    
    if ! command -v claude &> /dev/null; then
        error "❌ Claude CLI not installed"
        return 1
    fi
    
    local claude_version=$(claude --version 2>/dev/null || echo "unknown")
    debug "   📦 Claude version: $claude_version"
    
    if ! claude auth list &>/dev/null; then
        error "❌ Claude not authenticated. Run: claude auth login"
        return 1
    fi
    
    debug "   🔐 Claude authentication: OK"
    
    if ! claude config list &>/dev/null; then
        warning "⚠️ Claude config may have issues"
        return 1
    fi
    
    debug "   ⚙️ Claude configuration: OK"
    debug "✅ Claude environment validated successfully"
    return 0
}

# Function to create enhanced prompt with debug info
create_debug_prompt() {
    local task_content="$1"
    local requirement_id="$2"
    local project_path="$3"
    
    debug "🎯 Creating debug-enhanced prompt"
    
    local base_prompt=$(create_focused_prompt "$task_content" "$requirement_id")
    
    cat << EOF
$base_prompt

## Debug Information
- Project: $(basename "$project_path")
- Timestamp: $(date -Iseconds)
- Requirement ID: $requirement_id
- Generated by: Claude Watcher v2.0

EOF
} 