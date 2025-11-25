# Tools Extraction Summary - January 24, 2025

## Overview

Extracted Manager-specific functions into reusable tools that can be used across the application, including in Annette and other features.

## Extracted Tools

### 1. Requirement Generator (`src/lib/tools/requirement-generator.ts`)

**Purpose:** Generate Claude Code requirement files from user descriptions using LLM analysis.

**Main Function:**
```typescript
generateRequirementFile(input: RequirementGeneratorInput): Promise<RequirementGeneratorResult>
```

**Features:**
- Fetches context descriptions automatically if contextId provided
- Generates LLM-based implementation plan
- Creates Claude Code requirement file with proper naming
- Supports advisor types (improve, optimize, refactor, enhance)
- Supports iterative improvements with previous overview/bullets
- Includes standalone `generateImplementationPlan()` for plan-only generation

**Input Parameters:**
- `contextId` - Optional context ID for fetching context description
- `projectId` - Project ID for context lookup
- `projectPath` - Path to project for requirement file creation
- `description` - User description of what to implement
- `provider` - LLM provider (openai, gemini, anthropic, etc.)
- `title` - Optional title for the task
- `advisorType` - Optional advisor type for requirement naming
- `previousOverview` - Optional previous overview for iterative improvements
- `previousBullets` - Optional previous bullets for iterative improvements

**Usage Example:**
```typescript
import { generateRequirementFile } from '@/lib/tools';

const result = await generateRequirementFile({
  contextId: 'ctx-123',
  projectId: 'proj-456',
  projectPath: '/path/to/project',
  description: 'Add user authentication with JWT',
  provider: 'gemini',
  title: 'User Authentication',
  advisorType: 'enhance',
});

if (result.success) {
  console.log('Requirement created:', result.requirementName);
  console.log('Plan:', result.plan);
}
```

### 2. Implementation Accept (`src/lib/tools/implementation-accept.ts`)

**Purpose:** Mark implementation logs as tested/accepted.

**Main Function:**
```typescript
acceptImplementation(implementationLogId: string): Promise<AcceptImplementationResult>
```

**Features:**
- Marks implementation as tested via API
- Simple, one-line acceptance
- Includes batch accept for multiple implementations
- Includes reject functionality for future use

**Additional Functions:**
- `batchAcceptImplementations(ids: string[])` - Accept multiple implementations
- `rejectImplementation(id: string, reason?: string)` - Reject implementation

**Usage Example:**
```typescript
import { acceptImplementation } from '@/lib/tools';

const result = await acceptImplementation('log-id-123');
if (result.success) {
  console.log('Implementation accepted!');
}
```

### 3. Barrel Export (`src/lib/tools/index.ts`)

Centralized exports for all tools:
```typescript
import {
  generateRequirementFile,
  generateImplementationPlan,
  acceptImplementation,
  batchAcceptImplementations,
} from '@/lib/tools';
```

## Updated Files

### Manager Feature

**ManagerLayout.tsx:**
- ✅ Updated `handleAccept` to use `acceptImplementation` tool
- ✅ Removed direct API call, now uses reusable tool
- ✅ Cleaner, more maintainable code

**UserInputPanel.tsx:**
- ✅ Updated to use `generateRequirementFile` tool
- ✅ Updated to use `acceptImplementation` tool
- ✅ Simplified analyst section - no more separate plan generation + file creation
- ✅ Single tool call handles entire workflow

**NewTaskInputPanel.tsx:**
- ✅ Updated requirement creation to use standardized approach
- ✅ Maintains special multiproject handling
- ✅ Cleaner inline requirement generation logic

## Benefits

### 1. Reusability

These tools can now be used in:
- **Annette** - Voice assistant can accept implementations and create requirements
- **API Routes** - Backend processes can accept implementations programmatically
- **Background Workers** - Automated workflows can create requirements
- **CLI Tools** - Command-line scripts can use these functions
- **Other Features** - Any feature needing requirement generation or acceptance

### 2. Maintainability

- Single source of truth for requirement generation logic
- Changes to requirement format affect all features automatically
- Easier to test in isolation
- Clear, documented interfaces

### 3. Consistency

- All requirement files follow the same naming convention
- All acceptances use the same API pattern
- Consistent error handling across features

### 4. Future Extensibility

Easy to extend with additional functionality:
- Add requirement templates
- Add multi-provider fallback
- Add requirement validation
- Add acceptance with review notes
- Add batch operations

## Migration Path

### For New Features

Simply import and use the tools:

```typescript
import { generateRequirementFile, acceptImplementation } from '@/lib/tools';

// In Annette:
async function annetteAccept(logId: string) {
  const result = await acceptImplementation(logId);
  return result.success
    ? "Implementation accepted!"
    : `Failed: ${result.error}`;
}

// In background worker:
async function autoGenerate(contextId: string, description: string) {
  const result = await generateRequirementFile({
    contextId,
    projectPath: '/path/to/project',
    description,
    provider: 'gemini',
  });
  // Process result...
}
```

### For Existing Features

1. Import tools from `@/lib/tools`
2. Replace direct API calls with tool functions
3. Update error handling to use tool result format
4. Test functionality

## Example: Annette Integration

Here's how Annette could use these tools:

```typescript
// In Annette action handlers:
import { generateRequirementFile, acceptImplementation } from '@/lib/tools';

const annetteActions = {
  createRequirement: async (contextId: string, userRequest: string) => {
    const result = await generateRequirementFile({
      contextId,
      projectId: currentProject.id,
      projectPath: currentProject.path,
      description: userRequest,
      provider: 'gemini',
      title: 'Annette Request',
    });

    if (result.success) {
      return {
        action: 'speak',
        message: `I've created requirement ${result.requirementName}. Claude Code is ready to execute it!`,
      };
    } else {
      return {
        action: 'speak',
        message: `Sorry, I couldn't create the requirement: ${result.error}`,
      };
    }
  },

  acceptImplementation: async (logId: string) => {
    const result = await acceptImplementation(logId);

    if (result.success) {
      return {
        action: 'speak',
        message: 'Implementation accepted! Great work.',
      };
    } else {
      return {
        action: 'speak',
        message: `I couldn't accept the implementation: ${result.error}`,
      };
    }
  },
};
```

## Technical Details

### Requirement File Naming

Format: `[advisor-type-]title-timestamp.md`

Example: `enhance-user-authentication-2025-01-24T10-30-00.md`

### Implementation Plan Prompt

The tool builds a comprehensive prompt that includes:
- Context description (if available)
- Previous overview and bullets (for iterative improvements)
- User request
- Structured output instructions
- Best practices for Claude Code execution

### Error Handling

Both tools return structured results:
```typescript
{
  success: boolean;
  requirementName?: string;  // Only for requirement generator
  plan?: string;             // Only for requirement generator
  error?: string;            // Only if success = false
}
```

## Files Structure

```
src/lib/tools/
├── requirement-generator.ts  # Requirement generation tool
├── implementation-accept.ts  # Implementation acceptance tool
└── index.ts                  # Barrel exports

src/app/features/Manager/
├── ManagerLayout.tsx         # Updated to use tools
├── components/
│   ├── UserInputPanel.tsx    # Updated to use tools
│   └── NewTaskInputPanel.tsx # Updated to use tools
└── lib/
    └── llmHelpers.ts         # Original functions (kept for backward compatibility)
```

## Next Steps

### Recommended: Annette Integration

1. Create Annette tool actions in `src/app/features/Annette/tools/`
2. Import requirement-generator and implementation-accept
3. Add voice commands for:
   - "Create a requirement for [description]"
   - "Accept implementation [id/title]"
   - "Generate plan for [description]"
4. Test with voice interface

### Optional Enhancements

1. **Add requirement templates:**
   ```typescript
   generateRequirementFile({
     ...options,
     template: 'feature' | 'bugfix' | 'refactor',
   });
   ```

2. **Add validation:**
   ```typescript
   const validation = await validateRequirement(plan);
   if (!validation.isValid) {
     // Show warnings or regenerate
   }
   ```

3. **Add multiproject support:**
   ```typescript
   generateRequirementFile({
     ...options,
     secondaryProjectPath: '/path/to/backend',
     secondaryContextId: 'ctx-backend-123',
   });
   ```

## Testing

Type checking confirms no new errors introduced in Manager files. The tools are ready for use across the application.

## Summary

- ✅ **2 new tools created** (requirement-generator, implementation-accept)
- ✅ **3 Manager files updated** to use new tools
- ✅ **Backward compatible** - original functions still available if needed
- ✅ **Ready for Annette integration**
- ✅ **Type-safe and well-documented**
