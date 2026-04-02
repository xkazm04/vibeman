# Claude Code CLI Programmatic Usage - Research

**Researched:** 2026-04-01
**Domain:** Claude Code CLI subprocess integration, streaming protocols, programmatic automation
**Confidence:** HIGH (official docs + SDK specs verified)

## Summary

Claude Code CLI (the `claude` binary) can be spawned as a subprocess for fully programmatic, non-interactive usage via the `-p` (print) flag. This is distinct from the Agent SDK Python/TypeScript packages which require API key authentication -- the CLI binary itself authenticates via the user's existing Claude subscription (Pro/Max/Team/Enterprise), meaning programmatic usage does NOT consume API credits when authenticated through OAuth.

The CLI supports a bidirectional NDJSON (newline-delimited JSON) streaming protocol via `--output-format stream-json` and `--input-format stream-json`, emitting structured message types (`system`, `assistant`, `user`, `result`, `stream_event`) that can be parsed line-by-line. Session resumption (`--resume`, `--continue`), MCP server integration (`--mcp-config`), and full permission bypass (`--dangerously-skip-permissions`) make it viable for building chat/conversation UIs and automation pipelines on top of the CLI.

**Primary recommendation:** Spawn `claude -p --output-format stream-json --verbose` as a subprocess, parse NDJSON lines from stdout, and use `--resume <session_id>` for multi-turn conversations. Use `--bare` for faster startup in scripted/CI contexts. For bidirectional streaming, add `--input-format stream-json`.

---

## 1. Spawning Claude Code as a Subprocess

### Authentication: CLI (Subscription) vs SDK (API Key)

| Approach | Authentication | Billing | Programmatic? |
|----------|---------------|---------|---------------|
| `claude -p` (CLI binary) | OAuth / Max plan subscription | Subscription (flat rate) | Yes |
| Agent SDK (Python/TS packages) | `ANTHROPIC_API_KEY` | API usage (pay-per-token) | Yes |
| Agent SDK with OAuth workaround | `CLAUDE_CODE_OAUTH_TOKEN` | Subscription | Yes |

**Critical distinction:** The `claude` CLI binary uses the user's subscription when authenticated via `claude auth login`. The Agent SDK packages (`@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk`) normally require an `ANTHROPIC_API_KEY` and bill per-token. However, the SDK can also use Max plan billing by exporting the OAuth token: `export CLAUDE_CODE_OAUTH_TOKEN=TOKEN` (after running `claude setup-token`).

**Confidence:** HIGH - Verified via official docs and GitHub issue #559 (closed as COMPLETED).

### Basic Subprocess Spawn

```bash
# Simple one-shot query (text output)
claude -p "Explain this function"

# JSON output with metadata (session_id, usage, etc.)
claude -p "Summarize this project" --output-format json

# Streaming NDJSON output
claude -p "Explain recursion" --output-format stream-json --verbose

# Full streaming with partial messages (token-level)
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages

# Piped input
cat file.ts | claude -p "Review this code" --output-format json
```

### Subprocess Spawn with All Programmatic Flags

```bash
claude -p \
  --output-format stream-json \
  --verbose \
  --include-partial-messages \
  --model opus \
  --allowedTools "Read,Edit,Bash,Glob,Grep" \
  --dangerously-skip-permissions \
  --mcp-config ./mcp.json \
  "Your prompt here"
```

### Bare Mode (Faster Startup)

Added in v2.1.81. Skips auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md. Recommended for scripted and CI calls.

```bash
claude --bare -p "Summarize this file" --allowedTools "Read"
```

**Important:** Bare mode skips OAuth and keychain reads. Authentication must come from `ANTHROPIC_API_KEY` or an `apiKeyHelper` in settings JSON passed via `--settings`. For subscription-based auth, do NOT use `--bare`.

**Confidence:** HIGH - Official docs state `--bare` will become the default for `-p` in a future release.

---

## 2. The `--output-format stream-json` Flag

### Overview

Emits newline-delimited JSON (NDJSON) on stdout. Each line is a complete JSON object with a `type` field. Requires `-p` (print mode).

### Output Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| `text` | Plain text (default) | Human consumption, simple scripts |
| `json` | Single JSON object at end | Programmatic, need metadata |
| `stream-json` | NDJSON stream, one JSON per line | Real-time streaming UIs, chat interfaces |

### Message Types in stream-json

There are 5 top-level message types:

#### 1. `system` - Session Initialization (emitted once at start)

```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "uuid-here",
  "uuid": "unique-message-id",
  "model": "claude-sonnet-4-5-20250929",
  "tools": ["Read", "Edit", "Bash", "Glob", "Grep"],
  "mcp_servers": [],
  "cwd": "/path/to/working/dir",
  "permissionMode": "bypassPermissions",
  "apiKeySource": "ANTHROPIC_API_KEY"
}
```

Also used for retry events:
```json
{
  "type": "system",
  "subtype": "api_retry",
  "attempt": 1,
  "max_retries": 5,
  "retry_delay_ms": 2000,
  "error_status": 429,
  "error": "rate_limit",
  "uuid": "...",
  "session_id": "..."
}
```

#### 2. `assistant` - Claude's Response

```json
{
  "type": "assistant",
  "uuid": "msg-uuid",
  "session_id": "session-uuid",
  "message": {
    "content": [
      {"type": "text", "text": "Here is my analysis..."},
      {"type": "tool_use", "id": "toolu_xxx", "name": "Read", "input": {"file_path": "/src/main.ts"}}
    ],
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 567,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 890
    }
  }
}
```

#### 3. `user` - Tool Results (returned to Claude)

```json
{
  "type": "user",
  "uuid": "msg-uuid",
  "session_id": "session-uuid",
  "message": {
    "content": [
      {"type": "tool_result", "tool_use_id": "toolu_xxx", "content": "file contents here..."}
    ]
  },
  "tool_use_result": {}
}
```

#### 4. `result` - Final Completion (ends the stream)

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "num_turns": 3,
  "duration_ms": 15420,
  "duration_api_ms": 12300,
  "result": "Final text output here",
  "total_cost_usd": 0.045,
  "session_id": "session-uuid",
  "usage": {
    "input_tokens": 5000,
    "output_tokens": 2000
  },
  "modelUsage": {},
  "permission_denials": []
}
```

Result subtypes: `"success"`, `"error_max_turns"`, `"error_max_budget_usd"`, `"error_during_execution"`

#### 5. `stream_event` - Token-Level Streaming (requires `--include-partial-messages`)

```json
{
  "type": "stream_event",
  "uuid": "evt-uuid",
  "session_id": "session-uuid",
  "parent_tool_use_id": null,
  "event": {
    "type": "content_block_delta",
    "delta": {
      "type": "text_delta",
      "text": "Hello"
    }
  }
}
```

Stream event subtypes (in `event.type`):

| Event Type | Description |
|------------|-------------|
| `message_start` | Start of a new message |
| `content_block_start` | Start of a content block (text or tool_use) |
| `content_block_delta` | Incremental update (text_delta or input_json_delta) |
| `content_block_stop` | End of a content block |
| `message_delta` | Message-level updates (stop_reason, usage) |
| `message_stop` | End of the message |

### Message Flow

```
system (init)
stream_event (message_start)
stream_event (content_block_start) - text block
stream_event (content_block_delta) - text chunks...
stream_event (content_block_stop)
stream_event (content_block_start) - tool_use block
stream_event (content_block_delta) - tool input chunks (input_json_delta)...
stream_event (content_block_stop)
stream_event (message_delta)
stream_event (message_stop)
assistant - complete message with all content
user - tool results
... more turns ...
result - final completion
```

### Extracting Streaming Text with jq

```bash
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

**Confidence:** HIGH - Verified via official headless docs, Agent SDK streaming docs, and SDK spec gist.

---

## 3. The `-p` (Print) Flag

Non-interactive single-prompt mode. Claude processes the prompt, executes any tool calls, and exits when done.

```bash
# Basic usage
claude -p "What does the auth module do?"

# With JSON output
claude -p "Summarize this project" --output-format json

# With piped input
cat error.log | claude -p "Explain this error"

# Extract just the result text from JSON
claude -p "Summarize this project" --output-format json | jq -r '.result'
```

### Key behaviors in print mode:
- No interactive terminal UI
- Exits after completion
- Supports all `--output-format` options
- Can be combined with `--continue` and `--resume`
- `--max-turns` limits agentic turns (exits with error when reached)
- `--max-budget-usd` limits API spend
- `--fallback-model` enables automatic model fallback on overload
- `--no-session-persistence` prevents session saving to disk
- `--json-schema` validates output against a JSON Schema

**Confidence:** HIGH - Official CLI reference.

---

## 4. Session Resumption

### `--continue` / `-c`

Continues the most recent conversation in the current working directory:

```bash
# First request
claude -p "Review this codebase for performance issues"

# Continue with context from previous
claude -p "Now focus on the database queries" --continue
claude -p "Generate a summary of all issues found" --continue
```

### `--resume` / `-r`

Resumes a specific session by ID or name:

```bash
# Capture session ID from first request
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')

# Resume that specific session
claude -p "Continue that review" --resume "$session_id"
```

### `--name` / `-n` (v2.1.76+)

Names a session for easier resumption:

```bash
# Start a named session
claude -p "Begin auth refactor analysis" --name "auth-refactor"

# Resume by name later
claude -r "auth-refactor" "Continue the analysis"
```

### `--fork-session`

Creates a new session ID when resuming (branches the conversation):

```bash
claude --resume abc123 --fork-session "Try a different approach"
```

### `--session-id`

Uses a specific UUID for the session:

```bash
claude --session-id "550e8400-e29b-41d4-a716-446655440000" -p "query"
```

### Deferred Permission Resumption (v2.1.89+)

`PreToolUse` hooks can return `"defer"` to pause at tool calls, allowing later resumption:

```bash
# Resume a deferred session
claude -p --resume <session_id> "proceed"
```

**Confidence:** HIGH - Official CLI reference + headless docs.

---

## 5. The `--dangerously-skip-permissions` Flag

Equivalent to `--permission-mode bypassPermissions`. Disables all permission prompts and safety checks.

```bash
claude -p "refactor the auth module" --dangerously-skip-permissions
```

### What it DOES skip:
- All tool permission prompts (Bash, Edit, Write, etc.)
- Safety confirmation dialogs

### What it does NOT skip:
- Writes to `.git`, `.vscode`, `.idea` directories (still prompt to prevent repo/config corruption)
- Writes to `.claude` (except `.claude/commands`, `.claude/agents`, `.claude/skills`)

### Security Considerations:
- Only use in isolated environments (containers, VMs, devcontainers)
- No protection against prompt injection
- Administrators can disable via `permissions.disableBypassPermissionsMode: "disable"` in managed settings
- For safer autonomous operation, consider `--permission-mode auto` (requires Team/Enterprise/API plan + Sonnet 4.6 or Opus 4.6)

### Alternative: `--allow-dangerously-skip-permissions`

Adds `bypassPermissions` to the Shift+Tab mode cycle without starting in it:

```bash
claude --permission-mode plan --allow-dangerously-skip-permissions
```

### Alternative: `--permission-mode dontAsk`

Auto-denies every tool not explicitly allowed. Fully non-interactive:

```bash
claude -p --permission-mode dontAsk --allowedTools "Read,Glob,Grep" "Review the codebase"
```

### Alternative: `--permission-prompt-tool`

Delegates permission decisions to an MCP tool for custom permission handling:

```bash
claude -p --permission-prompt-tool mcp_auth_tool "query"
```

**Confidence:** HIGH - Official permission modes documentation.

---

## 6. The `--model` Flag

Sets the model for the session. Accepts aliases or full model names:

```bash
# Aliases (latest versions)
claude -p --model sonnet "query"
claude -p --model opus "query"

# Full model names
claude -p --model claude-sonnet-4-6 "query"
claude -p --model claude-opus-4-6 "query"

# With fallback
claude -p --model opus --fallback-model sonnet "query"
```

### Effort Levels (v2.1.71+)

```bash
claude -p --effort high "complex analysis task"
claude -p --effort low "simple question"
```

Options: `low`, `medium`, `high`. The `max` level was removed in v2.1.71 (simplified to 3 levels).

### Model Overrides (v2.1.73+)

The `modelOverrides` setting maps picker entries to custom provider model IDs (Bedrock ARNs, etc.):

```json
{
  "modelOverrides": {
    "opus": "arn:aws:bedrock:us-east-1:123456:model/anthropic.claude-opus-4-6-v1"
  }
}
```

### Custom Model Options

Environment variable `ANTHROPIC_CUSTOM_MODEL_OPTION` for custom `/model` picker entries.

**Confidence:** HIGH - Official CLI reference.

---

## 7. Bidirectional Streaming (input-format stream-json)

### Overview

For full bidirectional communication, use both `--input-format stream-json` and `--output-format stream-json`. This allows sending messages to Claude's stdin while receiving responses on stdout.

```bash
claude -p \
  --input-format stream-json \
  --output-format stream-json \
  --verbose \
  --include-partial-messages
```

**WARNING:** This protocol is largely undocumented by Anthropic (GitHub issues #24594 and #24596 were closed as "not planned"). The following is based on reverse engineering by community projects and SDK source analysis.

### Input Message Format (stdin)

User messages sent to stdin:

```json
{"type": "user", "message": {"role": "user", "content": "Your message here"}, "parent_tool_use_id": null, "session_id": "..."}
```

### Permission Control Protocol

When Claude requests permission (without `--dangerously-skip-permissions`):

**Incoming (stdout):** `control_request` with subtype `can_use_tool`:
```json
{
  "type": "control_request",
  "subtype": "can_use_tool",
  "tool_name": "Bash",
  "input": {"command": "npm test"},
  "decision_reason": "...",
  "tool_use_id": "toolu_xxx"
}
```

**Outgoing (stdin):** `control_response` with allow/deny:
```json
{
  "type": "control_response",
  "tool_use_id": "toolu_xxx",
  "permission_decision": "allow"
}
```

### Additional Flags for Bidirectional

- `--replay-user-messages`: Re-emits user messages from stdin back on stdout for acknowledgment
- `--permission-prompt-tool stdio`: Routes permission prompts through the stream instead of auto-denying

**Confidence:** LOW-MEDIUM - Based on community reverse engineering. The protocol works but is not officially documented. Third-party SDKs (Go, Rust, Elixir, Python, TypeScript) all implement this same protocol successfully.

---

## 8. MCP Server Integration in Subprocess Mode

MCP servers work in headless/print mode via `--mcp-config`:

```bash
claude -p --mcp-config ./mcp.json "Use the database tool to query users"
```

### MCP Config JSON Format

```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@my-org/my-mcp-server"],
      "env": {
        "API_KEY": "xxx"
      }
    },
    "remote-server": {
      "type": "streamable-http",
      "url": "https://my-server.example.com/mcp"
    }
  }
}
```

### Key MCP Flags

| Flag | Description |
|------|-------------|
| `--mcp-config <path>` | Load MCP servers from JSON file(s), space-separated |
| `--strict-mcp-config` | Only use MCP servers from `--mcp-config`, ignore all other MCP configs |

### MCP in Bare Mode

With `--bare`, no MCP servers are auto-discovered. You MUST pass `--mcp-config` explicitly:

```bash
claude --bare -p --mcp-config ./mcp.json "query"
```

### Non-Blocking MCP Connections (v2.1.89+)

```bash
MCP_CONNECTION_NONBLOCKING=true claude -p "query"
```

Skips waiting for MCP server connections in `-p` mode. Server connections bounded at 5 seconds.

### MCP Environment Variables (v2.1.85+)

- `CLAUDE_CODE_MCP_SERVER_NAME`: Available to `headersHelper` scripts
- `CLAUDE_CODE_MCP_SERVER_URL`: Available to `headersHelper` scripts

### MCP Elicitation (v2.1.76+)

MCP servers can request structured input mid-task via interactive dialog (form fields or browser URL).

**Confidence:** HIGH - Official MCP documentation + changelog.

---

## 9. New Flags and Capabilities (v2.1.70+)

### v2.1.89 (April 1, 2026)
- **Deferred permissions in headless**: `PreToolUse` hooks can return `"defer"` to pause and resume with `-p --resume`
- **Non-blocking MCP**: `MCP_CONNECTION_NONBLOCKING=true` for faster `-p` startup

### v2.1.86 (March 27, 2026)
- **Session tracking header**: `X-Claude-Code-Session-Id` for proxy aggregation

### v2.1.84 (March 26, 2026)
- **Streaming timeout**: `CLAUDE_STREAM_IDLE_TIMEOUT_MS` configurable watchdog
- **TaskCreated hook**: New hook event for task creation
- **PowerShell tool**: Windows opt-in preview

### v2.1.83 (March 25, 2026)
- **Credential scrubbing**: `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` strips credentials from subprocess environments
- **CwdChanged/FileChanged hooks**: New lifecycle hook events
- **Sandbox failIfUnavailable**: `sandbox.failIfUnavailable` setting

### v2.1.81 (March 20, 2026)
- **`--bare` flag**: Minimal mode for scripted `-p` calls
- **`--channels` flag**: Permission relay for channel servers (research preview)

### v2.1.80 (March 19, 2026)
- **Rate limits in statusline**: `rate_limits` field with `used_percentage` and `resets_at`

### v2.1.79 (March 18, 2026)
- **Console auth**: `claude auth login --console` for API billing authentication

### v2.1.78 (March 17, 2026)
- **StopFailure hook**: Fires when turn ends due to API error
- **Line-by-line streaming**: Response text now streams line-by-line
- **`ANTHROPIC_CUSTOM_MODEL_OPTION`**: Custom model picker entries

### v2.1.77 (March 17, 2026)
- **Increased output tokens**: Opus 4.6 defaults to 64k (up to 128k)

### v2.1.76 (March 14, 2026)
- **MCP elicitation**: Servers can request structured input mid-task
- **`-n`/`--name` flag**: Session display name at startup
- **`worktree.sparsePaths`**: Sparse checkouts for large monorepos
- **PostCompact hook**: Fires after context compaction

### v2.1.75 (March 13, 2026)
- **1M context window**: Available for Opus 4.6 on Max/Team/Enterprise

### v2.1.74 (March 12, 2026)
- **`/context` command**: Identifies context optimization improvements
- **`autoMemoryDirectory`**: Custom auto-memory file location

### v2.1.73 (March 11, 2026)
- **`modelOverrides` setting**: Map picker entries to custom model IDs (Bedrock ARNs, etc.)

### v2.1.72 (March 10, 2026)
- **`/loop` command**: Recurring execution (`/loop 5m <prompt>`)
- **CronCreate tool**: Scheduled prompts
- **ExitWorktree tool**: Leave worktree sessions

### v2.1.71 (March 7, 2026)
- **Simplified effort levels**: Low/medium/high (removed max)
- **`includeGitInstructions` setting**: Control git instructions
- **InstructionsLoaded hook**: Fires when CLAUDE.md loaded
- **`${CLAUDE_SKILL_DIR}` variable**: Skill directory references in skills

### v2.1.70 (March 6, 2026)
- **Tool search with `ANTHROPIC_BASE_URL`**: Works if `ENABLE_TOOL_SEARCH` set
- **Remote Control naming**: Optional `--name` for custom titles
- **MCP OAuth RFC**: Follows RFC 9728 Protected Resource Metadata discovery
- **MCP tool caps**: Descriptions/instructions capped at 2KB

**Confidence:** HIGH - Official changelog.

---

## 10. System Prompt Customization

Four flags for system prompt control (all work in both interactive and non-interactive modes):

| Flag | Behavior |
|------|----------|
| `--system-prompt <text>` | Replaces entire default prompt |
| `--system-prompt-file <path>` | Replaces with file contents |
| `--append-system-prompt <text>` | Appends to default prompt |
| `--append-system-prompt-file <path>` | Appends file contents to default |

**Recommendation:** Use `--append-system-prompt` for most cases (preserves Claude Code's built-in capabilities). Only use `--system-prompt` when you need complete control.

```bash
# Append custom instructions
claude -p --append-system-prompt "Always respond in JSON format" "Analyze auth.py"

# Full custom prompt for specialized agents
claude -p --system-prompt "You are a security auditor. Only report vulnerabilities." "Review the codebase"

# Load from file
claude -p --append-system-prompt-file ./custom-rules.txt "Do the task"
```

---

## 11. Tool Control

### Allow specific tools (auto-approve without prompting)

```bash
claude -p --allowedTools "Read,Edit,Bash" "Fix the bug"

# With glob patterns (note: space before * is important)
claude -p --allowedTools "Bash(git diff *)" "Show changes"
```

### Restrict available tools

```bash
# Only allow specific tools
claude -p --tools "Bash,Edit,Read" "Fix the bug"

# Disable all tools
claude -p --tools "" "Just answer the question"
```

### Block specific tools

```bash
claude -p --disallowedTools "Bash(rm *)" "Clean up the codebase"
```

---

## 12. Complete Programmatic Usage Recipe

### One-Shot Task (Simple)

```bash
result=$(claude -p --output-format json "Summarize this project")
echo "$result" | jq -r '.result'
session_id=$(echo "$result" | jq -r '.session_id')
```

### Multi-Turn Conversation

```bash
# Turn 1: Start
session_id=$(claude -p --output-format json "Analyze the auth module" | jq -r '.session_id')

# Turn 2: Follow up
claude -p --resume "$session_id" --output-format json "What security issues did you find?"

# Turn 3: Action
claude -p --resume "$session_id" --output-format json \
  --allowedTools "Edit" "Fix the most critical issue"
```

### Streaming Chat UI (Node.js subprocess)

```javascript
const { spawn } = require('child_process');

const claude = spawn('claude', [
  '-p',
  '--output-format', 'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--model', 'sonnet',
  '--allowedTools', 'Read,Glob,Grep',
  'Explain the project architecture'
]);

let buffer = '';
claude.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      switch (msg.type) {
        case 'system':
          if (msg.subtype === 'init') {
            console.log('Session:', msg.session_id);
            console.log('Model:', msg.model);
          }
          break;
        case 'stream_event':
          if (msg.event?.type === 'content_block_delta' &&
              msg.event?.delta?.type === 'text_delta') {
            process.stdout.write(msg.event.delta.text);
          }
          break;
        case 'assistant':
          // Complete assistant message (after streaming finishes)
          break;
        case 'user':
          // Tool results
          break;
        case 'result':
          console.log('\n--- Done ---');
          console.log('Turns:', msg.num_turns);
          console.log('Duration:', msg.duration_ms, 'ms');
          break;
      }
    } catch (e) {
      // Ignore parse errors on incomplete lines
    }
  }
});

claude.stderr.on('data', (data) => {
  console.error('stderr:', data.toString());
});

claude.on('close', (code) => {
  console.log('Process exited with code:', code);
});
```

### Fully Autonomous with MCP

```bash
claude -p \
  --output-format stream-json \
  --verbose \
  --model opus \
  --dangerously-skip-permissions \
  --mcp-config ./mcp-servers.json \
  --max-turns 20 \
  --max-budget-usd 5.00 \
  --append-system-prompt "You are a code review agent. Analyze all files and report issues." \
  "Review the entire codebase for security vulnerabilities"
```

---

## 13. Environment Variables for Automation

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key authentication |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Max plan billing with SDK |
| `MCP_CONNECTION_NONBLOCKING=true` | Skip MCP connection wait in `-p` mode |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` | Strip credentials from subprocess environments |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | Configure streaming watchdog timeout |
| `CLAUDE_CODE_DISABLE_CRON` | Disable scheduled jobs |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | Skip git instructions in prompt |
| `ENABLE_TOOL_SEARCH` | Enable tool search with custom base URLs |
| `OTEL_LOG_TOOL_DETAILS=1` | Log tool parameters in OpenTelemetry traces |
| `CLAUDE_CODE_SIMPLE` | Set by `--bare` flag, minimal mode indicator |

---

## Common Pitfalls

### Pitfall 1: Using SDK When CLI Suffices (Billing Surprise)
**What goes wrong:** Developer uses the Agent SDK (Python/TS package) for automation, not realizing it bills per-token via API, when `claude -p` with subscription auth would be free.
**How to avoid:** Use `claude -p` directly for subprocess automation. Only use the Agent SDK when you need its programmatic callbacks and typed message objects.

### Pitfall 2: Forgetting `--verbose` with `stream-json`
**What goes wrong:** `--output-format stream-json` requires `--verbose` for full event output. Without it, you get minimal output.
**How to avoid:** Always use `--verbose` when using `stream-json`.

### Pitfall 3: Not Handling NDJSON Line Boundaries
**What goes wrong:** Treating stdout as complete JSON objects. Chunks may split across read boundaries.
**How to avoid:** Buffer stdout, split on newlines, parse complete lines only. Keep partial lines in buffer.

### Pitfall 4: Session ID Not Captured
**What goes wrong:** Wanting to resume a session but not capturing `session_id` from the `system` init message or `result` message.
**How to avoid:** With `--output-format json`, session_id is in the result. With `stream-json`, capture it from the first `system` message with `subtype: "init"`.

### Pitfall 5: `--bare` with OAuth Auth
**What goes wrong:** Using `--bare` flag with OAuth/subscription authentication fails because bare mode skips keychain reads.
**How to avoid:** `--bare` requires `ANTHROPIC_API_KEY` or `apiKeyHelper`. For subscription auth, omit `--bare`.

### Pitfall 6: Auto-Deny in Non-Interactive Mode
**What goes wrong:** Without `--dangerously-skip-permissions` or `--allowedTools`, tools are denied in `-p` mode because there is no user to approve.
**How to avoid:** Always specify `--allowedTools` or `--dangerously-skip-permissions` for unattended execution.

---

## Known Limitations

1. **Extended thinking incompatible with streaming**: When `max_thinking_tokens` is explicitly set, `StreamEvent` messages are NOT emitted. Only complete messages are sent.
2. **Structured output not streamed**: JSON schema results appear only in final `ResultMessage.structured_output`, not as streaming deltas.
3. **Input-format stream-json undocumented**: Bidirectional protocol works but is not officially documented (issues closed as "not planned").
4. **Auto mode requires specific plans/models**: Only Team, Enterprise, or API plan + Sonnet 4.6 or Opus 4.6.

---

## Sources

### Primary (HIGH confidence)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference) - Complete flag listing
- [Run Claude Code Programmatically (Headless)](https://code.claude.com/docs/en/headless) - Official headless/print mode docs
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) - StreamEvent reference, message flow
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) - SDK capabilities, sessions, MCP
- [Permission Modes](https://code.claude.com/docs/en/permission-modes) - bypassPermissions, auto mode, dontAsk
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog) - Version history v2.1.70-v2.1.89

### Secondary (MEDIUM confidence)
- [GitHub Issue #24596](https://github.com/anthropics/claude-code/issues/24596) - stream-json event type gaps
- [GitHub Issue #24594](https://github.com/anthropics/claude-code/issues/24594) - input-format stream-json undocumented
- [GitHub Issue #559](https://github.com/anthropics/claude-agent-sdk-python/issues/559) - SDK Max plan billing workaround
- [SDK Spec Gist](https://gist.github.com/POWERFULMOVES/58bcadab9483bf5e633e865f131e6c25) - Reconstructed NDJSON protocol spec

### Tertiary (LOW confidence)
- [claude-code-rs](https://github.com/decisiongraph/claude-code-rs) - Rust SDK reverse-engineered protocol
- [Stream-JSON Chaining Wiki](https://github.com/ruvnet/ruflo/wiki/Stream-Chaining) - Community documentation

## Metadata

**Confidence breakdown:**
- CLI flags and basic usage: HIGH - Official docs, extensively verified
- stream-json output format: HIGH - Official SDK streaming docs + headless docs
- stream-json input format (bidirectional): LOW-MEDIUM - Undocumented, reverse-engineered
- Session management: HIGH - Official docs
- Permission modes: HIGH - Official docs
- MCP in subprocess: HIGH - Official docs
- Changelog / new features: HIGH - Official changelog

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (fast-moving - Claude Code releases weekly)
