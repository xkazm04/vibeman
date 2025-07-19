#!/bin/bash
# logging.sh - Logging functions for Claude watcher

# Logging setup and functions
setup_logging() {
    local log_file="$1"
    mkdir -p "$(dirname "$log_file")"
    
    # Colors for output
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
}

log() {
    local msg="${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo -e "$msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

success() {
    local msg="${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
    echo -e "$msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
}

error() {
    local msg="${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    echo -e "$msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

warning() {
    local msg="${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
    echo -e "$msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

debug() {
    if [[ "$VERBOSE" == "1" ]]; then
        local msg="${NC}[$(date '+%H:%M:%S')] DEBUG: $1${NC}"
        echo -e "$msg"
        echo "[$(date '+%H:%M:%S')] DEBUG: $1" >> "$LOG_FILE"
    fi
} 