#!/bin/bash
# Git Post-Commit Hook for Documentation Auto-Sync
# This script triggers documentation regeneration after each commit

# Configuration
API_URL="http://localhost:3000/api/docs/sync-on-commit"
PROJECT_ID="YOUR_PROJECT_ID_HERE"
PROJECT_PATH="$(pwd)"
PROJECT_NAME="$(basename $(pwd))"

# Get commit information
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)

# Trigger documentation sync
echo "Syncing project documentation..."

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"projectPath\": \"$PROJECT_PATH\",
    \"projectName\": \"$PROJECT_NAME\",
    \"commitSha\": \"$COMMIT_SHA\",
    \"commitMessage\": \"$COMMIT_MESSAGE\"
  }" \
  --silent > /dev/null 2>&1 &

echo "Documentation sync triggered in background"

exit 0
