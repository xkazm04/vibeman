# Memory Recording Skill

> Record decisions, insights, and learnings to Vibeman's Brain memory.
> Trigger: User asks to remember something, or explicitly invokes /mem

---

## Purpose

This skill records valuable information from manual Claude Code sessions into Vibeman's behavioral signals database. This enables the Brain's reflection system to learn from CLI interactions.

## When to Use

Use this when you:
- Make an important architectural decision
- Learn something valuable about the codebase
- Discover a pattern or anti-pattern
- Complete a significant task with lessons learned
- Want to record context for future sessions

## Usage Pattern

When the user says something like:
- "Remember that..."
- "Note that..."
- "/mem [category]: [message]"
- "Save this insight..."

Execute the memory recording.

## Categories

| Category | Use For | Weight |
|----------|---------|--------|
| `decision` | Architectural or implementation decisions | 2.0 |
| `pattern` | Discovered patterns (good or bad) | 1.8 |
| `insight` | Learned information about the codebase | 1.5 |
| `lesson` | Lessons learned from implementation | 1.5 |
| `context` | Important context for future sessions | 1.2 |

## Recording Procedure

### Step 1: Determine Project ID

Get the project ID from Vibeman. The user's current working directory should map to a project.

```bash
# Query projects API to find project by path
curl -s "http://localhost:3000/api/projects" | jq '.projects[] | select(.path == "'$(pwd)'")'
```

If no project found, inform user they need to add this project to Vibeman first.

### Step 2: Determine Category

Parse user's message to identify the category:
- Keywords like "decided", "chose", "went with" -> `decision`
- Keywords like "pattern", "convention", "always does" -> `pattern`
- Keywords like "learned", "discovered", "found out" -> `insight`
- Keywords like "lesson", "mistake", "next time" -> `lesson`
- General context -> `context`

### Step 3: Record the Memory

```bash
curl -X POST "http://localhost:3000/api/brain/signals" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "[PROJECT_ID]",
    "signalType": "cli_memory",
    "data": {
      "category": "[CATEGORY]",
      "message": "[USER_MESSAGE]",
      "source": "claude_code_cli",
      "sessionContext": "[WHAT_USER_WAS_WORKING_ON]"
    }
  }'
```

### Step 4: Confirm Recording

Tell the user the memory was recorded:

```
Recorded [category] memory: "[summary]"
  Weight: [weight] | Stored for Brain reflection
```

## Examples

### Example 1: Decision
User: "Remember that we chose SQLite with WAL mode for better concurrency"

-> Record as:
```json
{
  "category": "decision",
  "message": "Chose SQLite with WAL mode for better concurrency - provides good concurrent reads without PostgreSQL complexity",
  "source": "claude_code_cli"
}
```

### Example 2: Pattern
User: "/mem pattern: All feature modules follow Layout.tsx + components/ + lib/ structure"

-> Record as:
```json
{
  "category": "pattern",
  "message": "All feature modules follow Layout.tsx + components/ + lib/ structure",
  "source": "claude_code_cli"
}
```

### Example 3: Insight
User: "Note that contextStore uses custom subscriptions, not standard Zustand"

-> Record as:
```json
{
  "category": "insight",
  "message": "contextStore uses custom subscription system, not standard Zustand - don't treat it like other stores",
  "source": "claude_code_cli"
}
```

### Example 4: Lesson
User: "Lesson learned: always run type check before committing"

-> Record as:
```json
{
  "category": "lesson",
  "message": "Always run type check (npx tsc --noEmit) before committing - caught 3 type errors this session",
  "source": "claude_code_cli"
}
```

## Integration with Brain

Recorded memories:
1. Stored in `behavioral_signals` table with `signal_type = 'cli_memory'`
2. Contribute to Brain's behavioral context
3. Analyzed during autonomous reflections
4. Can generate learning insights
5. May influence future direction quality

## Tips for Users

- **Be specific**: "Database uses WAL mode" beats "database config"
- **Include reasoning**: "Chose X because Y" helps Brain understand thinking
- **Record immediately**: Context is freshest right after a decision
- **Don't over-record**: Focus on genuinely useful learnings
