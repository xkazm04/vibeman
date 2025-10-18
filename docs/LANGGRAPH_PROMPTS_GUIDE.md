# LangGraph Prompts Guide

## Overview

This guide explains the prompt system used by LangGraph for intelligent tool orchestration. The system uses both code-based prompts (in `langPrompts.ts`) and editable text files (in `data/prompts/`) to guide LLM behavior.

## Prompt Files

### 1. `analysis-task.txt`

**Purpose**: Instructions for analyzing user messages and selecting appropriate tools.

**Current Content**:
```
Analyze the user's message and determine:
1. What is the user's intent?
2. Does this require accessing the project knowledge base or performing actions?
3. Which tools (if any) should be used from the available categories?
4. Is this a destructive operation that requires confirmation?
5. What is your confidence level (0-100)?
6. Does this require user confirmation before proceeding?
7. Should multiple tools be chained together?
8. Are there alternative interpretations of the user's request?

**Tool Selection Guidelines:**
- Use Read-Only tools for questions and information retrieval
- Use Action tools (Project Management, Context, Task) for create/update/delete operations
- Use AI-Assisted tools for code analysis, documentation generation, or suggestions
- Use Monitoring tools for voicebot call analysis and evaluation
- Always prefer existing tools over suggesting manual approaches
- For complex queries, consider using multiple tools in sequence

**Confirmation Requirements:**
- ALWAYS require confirmation for destructive operations (delete, remove)
- ALWAYS require confirmation for operations that modify critical data (project settings)
- Require clarification when user intent is ambiguous (confidence < 80%)
- No confirmation needed for read-only operations

**Confidence Scoring:**
- 90-100%: Clear intent, exact tool match, no ambiguity
- 70-89%: Good match, minor assumptions needed
- 50-69%: Multiple interpretations possible, needs clarification
- Below 50%: Unclear intent, suggest alternatives or ask for clarification
```

**When to Edit**:
- Add new tool categories to selection guidelines
- Adjust confidence thresholds
- Add specific use case examples
- Refine confirmation requirements

---

### 2. `response-instructions.txt`

**Purpose**: Instructions for generating responses using tool results.

**Current Content**:
```
1. Answer the user's question using ONLY the data from tool results above
2. Be specific and reference actual data points from the results
3. If the tool results don't contain enough information, say so explicitly
4. Format your response clearly and professionally
5. If no tools were executed, inform the user that you need to access the knowledge base first
6. For destructive operations, confirm what was done and what was affected
7. For AI-assisted operations, summarize findings and provide actionable insights
8. If multiple tools were used, organize the response by tool results
9. Always cite which tool provided each piece of information
10. If an operation failed, explain why and suggest alternatives
```

**When to Edit**:
- Add formatting requirements for specific tool types
- Define citation format for tool results
- Add error handling instructions
- Specify output format for different operation types

---

### 3. `response-guidelines.txt`

**Purpose**: Formatting and presentation rules for responses.

**Current Content**:
```
- Start directly with the answer (no preamble like "Based on the data...")
- Use bullet points or numbered lists for clarity when appropriate
- Cite specific numbers, names, and details from the tool results
- If data is missing, suggest which tools could provide it
- Keep responses concise but complete
- For multi-tool operations, organize by sections (e.g., "Project Data:", "Analysis Results:")
- For destructive operations, summarize what was changed/deleted
- For AI-assisted operations, provide key findings first, then details
- Include actionable next steps when relevant
- Use code blocks for file paths, code snippets, or structured data
- If operation failed, clearly state the error and suggest fixes
```

**When to Edit**:
- Add styling preferences (emoji usage, formatting)
- Define structure for complex responses
- Add examples of good vs bad responses
- Specify tone and language style

---

### 4. `message-evaluation.txt`

**Purpose**: Prompt for LLM evaluation of voicebot messages (used by monitoring system).

**Key Sections**:
- Evaluation guidelines (checks against response-instructions.txt)
- Classification task (categorize messages into classes)
- Existing message classes (dynamic placeholder)
- Common class examples
- Strict JSON output format

**Usage**: Used by `POST /api/monitor/evaluate` to analyze voicebot conversations.

**When to Edit**:
- Add new evaluation criteria
- Define new message classifications
- Adjust JSON output schema
- Add examples for edge cases

## Code-Based Prompts

### `createAnalysisPrompt()` in `langPrompts.ts`

**Purpose**: Generates the analysis prompt with tool categorization.

**Key Features**:
- Auto-categorizes tools by name/description patterns
- Lists tools by category with required/optional parameters
- Includes tool selection strategy
- Defines JSON response format
- Provides usage examples

**Dynamic Elements**:
```typescript
toolsByCategory: {
  'Read-Only Operations': [...],
  'Project Management': [...],
  'Context & Documentation': [...],
  // ... 8 categories total
}
```

**When to Modify**:
- Change categorization logic
- Add new categories
- Modify JSON response schema
- Add new example scenarios

---

### `createResponsePrompt()` in `langPrompts.ts`

**Purpose**: Generates the final response prompt with tool results.

**Key Features**:
- Includes formatted tool results
- Adds project metadata context
- Enforces knowledge base usage
- Loads instructions from text files (with fallbacks)

**Dynamic Elements**:
```typescript
projectMetadata: {
  id, name, description, status, created_at
}

toolResults: [
  { name, description, parameters, result },
  // ...
]
```

**When to Modify**:
- Change result formatting
- Add metadata fields
- Modify enforcement rules
- Adjust response structure

## Prompt Hierarchy

```
User Message
     ↓
createAnalysisPrompt()
     ├─ analysis-task.txt (instructions)
     ├─ AVAILABLE_TOOLS (tool definitions)
     └─ Tool Selection Strategy (code)
     ↓
Analysis Result (JSON)
     ├─ userIntent
     ├─ toolsToUse
     ├─ needsConfirmation
     └─ confidence
     ↓
Tool Execution (if approved)
     ↓
createResponsePrompt()
     ├─ response-instructions.txt
     ├─ response-guidelines.txt
     ├─ Tool Results (formatted)
     └─ Project Metadata
     ↓
Final Response
```

## Editing Workflow

### 1. Edit Text Files Directly

```bash
# Edit analysis instructions
code data/prompts/analysis-task.txt

# Edit response instructions
code data/prompts/response-instructions.txt

# Edit formatting guidelines
code data/prompts/response-guidelines.txt
```

**Advantages**:
- No code changes needed
- Immediate effect (loaded on each request)
- Easy to test different phrasings
- No deployment required

**Limitations**:
- Can't change structure/logic
- Limited to text content
- No validation until runtime

### 2. Modify Code Prompts

```bash
# Edit prompt generation logic
code src/lib/langgraph/langPrompts.ts
```

**When to Use**:
- Change JSON schema
- Add new dynamic elements
- Modify categorization logic
- Add validation rules

**Requires**:
- TypeScript knowledge
- Understanding of prompt flow
- Testing and validation
- Deployment

## Testing Prompts

### Test Analysis Prompt

```bash
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me all projects",
    "projectId": "test",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

**Check**:
- Does it select the correct tool?
- Is confidence score appropriate?
- Does it require confirmation correctly?
- Are alternatives provided when needed?

### Test Response Prompt

```bash
# With userConfirmation=true to skip confirmation
curl -X POST http://localhost:3000/api/lang \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is in the backlog?",
    "projectId": "vibeman",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "userConfirmation": true
  }'
```

**Check**:
- Does response use ONLY tool data?
- Is formatting clear and professional?
- Are sources cited correctly?
- Are errors handled gracefully?

## Best Practices

### Writing Effective Prompts

1. **Be Specific**: Clear instructions reduce ambiguity
2. **Use Examples**: Show good and bad outputs
3. **Define Structure**: Specify exact format expected
4. **Set Boundaries**: Explicitly state what NOT to do
5. **Test Variations**: Try edge cases and ambiguous queries

### Prompt Maintenance

1. **Version Control**: Track changes to prompt files
2. **Document Changes**: Note why prompts were modified
3. **A/B Testing**: Compare old vs new prompts
4. **Collect Feedback**: Monitor user satisfaction
5. **Iterate**: Continuously improve based on results

### Common Pitfalls

❌ **Too Verbose**: Overwhelming LLM with too many instructions  
✅ **Concise & Clear**: Prioritize essential instructions

❌ **Vague Requirements**: "Be helpful"  
✅ **Specific Rules**: "Answer using ONLY tool results"

❌ **No Examples**: Abstract instructions only  
✅ **Concrete Examples**: Show expected input/output

❌ **Conflicting Instructions**: Rules that contradict  
✅ **Consistent Guidelines**: Aligned instructions

## Prompt Templates

### Analysis Prompt Template

```
You are [ROLE] analyzing user requests for [SYSTEM].

**CRITICAL RULES:**
1. [Rule 1]
2. [Rule 2]
...

**Your Task:**
[Task instructions from file]

**User Message:** "[message]"
**Project ID:** [projectId]

**Available Tools:**
[Tool categories and descriptions]

**Response Format (JSON):**
{
  "userIntent": "...",
  "needsTools": true/false,
  ...
}

**Examples:**
[Example scenarios]

Return ONLY the JSON response.
```

### Response Prompt Template

```
You are [ROLE], an AI assistant for [SYSTEM].

**CRITICAL RULES:**
[Enforcement rules]

**User's Original Question:** "[message]"
**User Intent:** [intent]

**Project Context:**
[Metadata]

**Knowledge Base Query Results:**
[Formatted tool results]

**Instructions:**
[Instructions from file]

**Response Guidelines:**
[Guidelines from file]

Generate your response now:
```

## Monitoring & Analytics

### Track Prompt Effectiveness

```typescript
// Log analysis results
console.log({
  message: userMessage,
  selectedTools: analysis.toolsToUse,
  confidence: analysis.confidence,
  needsConfirmation: analysis.needsConfirmation
});

// Measure response quality
console.log({
  toolsUsed: toolCalls.length,
  responseLength: response.length,
  executionTime: endTime - startTime
});
```

### Metrics to Monitor

- **Tool Selection Accuracy**: Are correct tools chosen?
- **Confidence Calibration**: Does confidence match correctness?
- **Confirmation Rates**: Are confirmations appropriate?
- **Response Quality**: Is output helpful and accurate?
- **Error Rates**: How often do operations fail?

## Future Enhancements

### Planned Improvements

1. **Dynamic Prompt Loading**: Hot-reload prompts without restart
2. **Multi-Language Support**: Prompts in different languages
3. **User-Specific Prompts**: Customize per user preferences
4. **Context-Aware Prompts**: Adjust based on conversation history
5. **Prompt Versioning**: A/B test different versions
6. **Analytics Dashboard**: Visualize prompt effectiveness

### Experimental Features

- **Few-Shot Learning**: Include successful examples in prompts
- **Chain-of-Thought**: Guide LLM through reasoning steps
- **Self-Critique**: Ask LLM to verify its own responses
- **Adaptive Prompts**: Modify based on success rates

---

**Last Updated**: 2025-01-14  
**Version**: 1.0.0  
**Related Docs**: LANGGRAPH_TOOLS.md, LLM_SETUP.md
