#!/bin/bash
# test-modules.sh - Test script for modular Claude watcher

set -e  # Exit on any error

echo "🧪 Testing Claude Watcher Modules..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the new modular core
source "$SCRIPT_DIR/watcher-core-new.sh"

# Test initialization
echo "📋 Testing initialization..."
TEST_LOG="/tmp/test-watcher.log"
if init_watcher "$TEST_LOG" 1; then
    echo "✅ Initialization successful"
else
    echo "❌ Initialization failed"
    exit 1
fi

# Test logging functions
echo "📋 Testing logging functions..."
log "This is a test log message"
success "This is a test success message"
warning "This is a test warning message"
debug "This is a test debug message"

# Test dependency checking
echo "📋 Testing dependency checking..."
if check_dependencies; then
    echo "✅ Dependencies check passed"
else
    echo "⚠️ Some dependencies missing (expected in test environment)"
fi

# Test task validation with a sample JSON
echo "📋 Testing task validation..."
SAMPLE_TASK="/tmp/sample-task.json"
cat << 'EOF' > "$SAMPLE_TASK"
{
    "id": "test-task-001",
    "prompt": "Add a hello world function",
    "context": ["src/test.js"],
    "priority": "medium",
    "created": "2024-01-01T12:00:00Z"
}
EOF

if validate_task_file "$SAMPLE_TASK"; then
    echo "✅ Task validation successful"
else
    echo "❌ Task validation failed"
    exit 1
fi

# Test prompt creation
echo "📋 Testing prompt creation..."
TASK_CONTENT=$(cat "$SAMPLE_TASK")
PROMPT_OUTPUT=$(create_focused_prompt "$TASK_CONTENT" "test-task-001")
if [[ -n "$PROMPT_OUTPUT" ]]; then
    echo "✅ Prompt creation successful"
    echo "Sample prompt (first 100 chars): ${PROMPT_OUTPUT:0:100}..."
else
    echo "❌ Prompt creation failed"
    exit 1
fi

# Test task status functions
echo "📋 Testing task status functions..."
create_processing_marker "$SAMPLE_TASK"
if [[ -f "$SAMPLE_TASK.processing" ]]; then
    echo "✅ Processing marker created"
    rm -f "$SAMPLE_TASK.processing"
else
    echo "❌ Processing marker creation failed"
    exit 1
fi

# Cleanup
rm -f "$SAMPLE_TASK" "$TEST_LOG"

echo ""
echo "🎉 All module tests passed successfully!"
echo "✅ The modular Claude watcher is ready for use"
echo ""
echo "📝 Next steps:"
echo "   1. Replace 'watcher-core.sh' with 'watcher-core-new.sh'"
echo "   2. Ensure the 'modules/' directory is accessible"
echo "   3. Update any scripts that source the core file" 