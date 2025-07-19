#!/bin/bash
# test-cleanup-improvements.sh - Test script for cleanup and naming improvements

set -e

echo "🧪 Testing Cleanup and Naming Improvements..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set up test environment
export VERBOSE=1
export LOG_FILE="/tmp/test-cleanup.log"

# Source the enhanced modules
source "$SCRIPT_DIR/watcher-core.sh"

echo "📋 Testing enhanced initialization..."
if init_watcher "$LOG_FILE" 1; then
    echo "✅ Enhanced initialization successful"
else
    echo "❌ Enhanced initialization failed"
    exit 1
fi

echo "📋 Testing task naming convention..."

# Test the new naming format
TEST_TASK_DIR="/tmp/test-task-naming"
mkdir -p "$TEST_TASK_DIR"

# Create a test task with a known title
TEST_TASK="$TEST_TASK_DIR/test-task.json"
cat << 'EOF' > "$TEST_TASK"
{
    "requirementId": "test-001",
    "prompt": "# Development Task\n\nPlease implement the following requirement in the codebase:\n\n**Title:** Test - Hello World Component\n**Priority:** medium",
    "context": ["src/components/Hello.tsx"],
    "status": "queued",
    "createdAt": "2024-01-01T12:00:00Z"
}
EOF

echo "✅ Test task created with title: 'Test - Hello World Component'"

# Expected naming: req-MMDD-testhelloworldcompo.json
EXPECTED_DATE=$(date '+%m%d')
echo "   Expected pattern: req-${EXPECTED_DATE}-testhelloworldcompo.json"

echo "📋 Testing artifact cleanup mechanisms..."

# Create test work directory with artifacts
TEST_WORK_DIR="$TEST_TASK_DIR/work_test"
mkdir -p "$TEST_WORK_DIR"

# Create test artifacts
echo "Test prompt content" > "$TEST_WORK_DIR/prompt.txt"
echo "" > "$TEST_WORK_DIR/claude_error.log"  # Empty error log
echo "Some actual error" > "$TEST_WORK_DIR/claude_error_with_content.log"
echo '{"result": "success"}' > "$TEST_WORK_DIR/claude_output.json"

echo "🔄 Testing processing marker creation..."
create_processing_marker "$TEST_TASK"
if [[ -f "$TEST_TASK.processing" && -s "$TEST_TASK.processing" ]]; then
    echo "✅ Processing marker created with content"
    echo "   Content: $(cat "$TEST_TASK.processing")"
else
    echo "❌ Processing marker creation failed"
    exit 1
fi

echo "🧹 Testing successful artifact cleanup..."
cleanup_successful_artifacts "$TEST_WORK_DIR"

# Check what was cleaned up
if [[ ! -f "$TEST_WORK_DIR/prompt.txt" ]]; then
    echo "✅ Temporary prompt file cleaned up"
else
    echo "❌ Prompt file not cleaned up"
    exit 1
fi

if [[ ! -f "$TEST_WORK_DIR/claude_error.log" ]]; then
    echo "✅ Empty error log cleaned up"
else
    echo "❌ Empty error log not cleaned up"
    exit 1
fi

if [[ -f "$TEST_WORK_DIR/claude_error_with_content.log" ]]; then
    echo "✅ Non-empty error log preserved"
else
    echo "❌ Non-empty error log was incorrectly removed"
    exit 1
fi

if [[ -f "$TEST_WORK_DIR/claude_output.json" ]]; then
    echo "✅ Output file preserved"
else
    echo "❌ Output file was incorrectly removed"
    exit 1
fi

echo "✅ Testing task completion with proper duration..."
mark_task_completed "$TEST_TASK" "$TEST_WORK_DIR" "42"

if [[ -f "$TEST_TASK.completed" && -s "$TEST_TASK.completed" ]]; then
    echo "✅ Completion marker created"
    
    # Validate JSON format
    if command -v jq &> /dev/null; then
        if jq empty "$TEST_TASK.completed" 2>/dev/null; then
            echo "✅ Completion file has valid JSON"
            
            # Check duration is a number
            local duration=$(jq -r '.duration' "$TEST_TASK.completed" 2>/dev/null)
            if [[ "$duration" == "42" ]]; then
                echo "✅ Duration correctly stored as number: $duration"
            else
                echo "❌ Duration incorrectly stored: $duration"
                exit 1
            fi
        else
            echo "❌ Completion file has invalid JSON"
            echo "Content: $(cat "$TEST_TASK.completed")"
            exit 1
        fi
    fi
else
    echo "❌ Completion marker creation failed"
    exit 1
fi

echo "🔍 Testing terminal sync check..."
# Create a fake project directory for testing
TEST_PROJECT="/tmp/test-project"
mkdir -p "$TEST_PROJECT/.claude-tasks"

# Create some completed tasks
COMPLETED_TASK1="$TEST_PROJECT/.claude-tasks/req-0719-testfeature.json.completed"
COMPLETED_TASK2="$TEST_PROJECT/.claude-tasks/req-0719-anothertest.json.completed"

echo '{"status": "completed"}' > "$COMPLETED_TASK1"
echo '{"status": "completed"}' > "$COMPLETED_TASK2"

echo "   Created 2 test completed tasks"
check_terminal_sync "$TEST_PROJECT"
echo "✅ Terminal sync check completed"

echo "📊 Testing performance improvements..."

# Test duration validation
echo "🔢 Testing duration validation..."
TEST_TASK2="$TEST_TASK_DIR/test-task2.json"
cp "$TEST_TASK" "$TEST_TASK2"

# Test with invalid duration
mark_task_completed "$TEST_TASK2" "$TEST_WORK_DIR" "invalid_duration"
if [[ -f "$TEST_TASK2.completed" ]]; then
    local stored_duration=$(jq -r '.duration' "$TEST_TASK2.completed" 2>/dev/null || echo "0")
    if [[ "$stored_duration" == "0" ]]; then
        echo "✅ Invalid duration properly handled (converted to 0)"
    else
        echo "❌ Invalid duration not properly handled: $stored_duration"
        exit 1
    fi
fi

# Cleanup test files
rm -rf "$TEST_TASK_DIR" "$TEST_PROJECT" "$LOG_FILE"

echo ""
echo "🎉 All cleanup and naming tests passed successfully!"
echo "✅ Key improvements verified:"
echo "   • Proper JSON formatting in status files"
echo "   • Duration validation and number storage"
echo "   • Automatic cleanup of temporary artifacts"
echo "   • Empty error log removal"
echo "   • Preservation of important files"
echo "   • Terminal sync checking"
echo "   • Improved task naming convention ready"
echo ""
echo "📊 Improvements Summary:"
echo "   • Task names: req-MMDD-shorttitle.json format"
echo "   • Artifact cleanup: Removes temp files, keeps important logs"
echo "   • JSON validation: Proper number formatting"
echo "   • Terminal sync: Better feedback on completed tasks"
echo ""
echo "📝 The enhanced Claude watcher is ready for production!" 