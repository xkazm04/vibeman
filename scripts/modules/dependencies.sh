#!/bin/bash
# dependencies.sh - Dependency management for Claude watcher

# Source logging functions
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

# Dependency check function
check_dependencies() {
    local missing_deps=()
    
    if ! command -v claude &> /dev/null; then
        missing_deps+=("claude")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "jq")
                    log "Installing jq..."
                    if sudo apt update && sudo apt install -y jq; then
                        log "✅ jq installed successfully"
                    else
                        error "Failed to install jq. Please run: sudo apt install jq"
                        return 1
                    fi
                    ;;
                "claude")
                    error "Claude CLI not found. Please install: npm install -g @anthropic-ai/claude-code"
                    return 1
                    ;;
            esac
        done
    fi
    
    return 0
} 