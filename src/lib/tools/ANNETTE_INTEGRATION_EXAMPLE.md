# Annette Integration Example

This file shows how to integrate the reusable tools into Annette.

## Quick Start

```typescript
// In Annette's tool handlers (e.g., src/app/features/Annette/tools/manager-tools.ts)

import { generateRequirementFile, acceptImplementation } from '@/lib/tools';

export const managerTools = {
  /**
   * Create a Claude Code requirement from user description
   * Usage: "Annette, create a requirement to add user authentication"
   */
  createRequirement: async (params: {
    description: string;
    contextId?: string;
    projectId?: string;
    projectPath: string;
  }) => {
    const result = await generateRequirementFile({
      contextId: params.contextId,
      projectId: params.projectId,
      projectPath: params.projectPath,
      description: params.description,
      provider: 'gemini', // Or use Annette's preferred provider
      title: params.description.split('\n')[0].substring(0, 50),
    });

    if (result.success) {
      return {
        success: true,
        message: `I've created requirement "${result.requirementName}". Claude Code is ready to execute it!`,
        requirementName: result.requirementName,
      };
    } else {
      return {
        success: false,
        message: `Sorry, I couldn't create the requirement: ${result.error}`,
        error: result.error,
      };
    }
  },

  /**
   * Accept an implementation log
   * Usage: "Annette, accept this implementation"
   */
  acceptImplementation: async (logId: string) => {
    const result = await acceptImplementation(logId);

    if (result.success) {
      return {
        success: true,
        message: 'Implementation accepted! Excellent work.',
      };
    } else {
      return {
        success: false,
        message: `I couldn't accept the implementation: ${result.error}`,
        error: result.error,
      };
    }
  },

  /**
   * Get implementation plan without creating requirement
   * Usage: "Annette, what's your plan for adding login?"
   */
  getPlan: async (params: {
    description: string;
    contextId?: string;
    projectId?: string;
  }) => {
    const { generateImplementationPlan } = await import('@/lib/tools');

    const plan = await generateImplementationPlan(
      params.description,
      'gemini',
      {
        contextId: params.contextId,
        projectId: params.projectId,
      }
    );

    return {
      success: true,
      message: 'Here\'s my implementation plan:',
      plan,
    };
  },
};
```

## Voice Command Examples

### Create Requirement

**User:** "Annette, create a requirement to add user authentication with JWT tokens"

**Annette Response:**
```typescript
{
  action: 'createRequirement',
  params: {
    description: 'Add user authentication with JWT tokens',
    contextId: getCurrentContextId(), // From current context
    projectId: getActiveProjectId(),
    projectPath: getActiveProjectPath(),
  }
}
```

**Result:** "I've created requirement 'add-user-authentication-with-jwt-tokens-2025-01-24T10-30-00.md'. Claude Code is ready to execute it!"

### Accept Implementation

**User:** "Annette, accept the last implementation"

**Annette Response:**
```typescript
{
  action: 'acceptImplementation',
  params: {
    logId: getLastImplementationId(),
  }
}
```

**Result:** "Implementation accepted! Excellent work."

### Get Plan Preview

**User:** "Annette, what's your plan for refactoring the authentication module?"

**Annette Response:**
```typescript
{
  action: 'getPlan',
  params: {
    description: 'Refactor the authentication module',
    contextId: getCurrentContextId(),
    projectId: getActiveProjectId(),
  }
}
```

**Result:** Shows detailed implementation plan without creating requirement file.

## Integration with Annette's Action System

```typescript
// In src/app/features/Annette/lib/actionHandler.ts

import { managerTools } from '../tools/manager-tools';

export async function handleAnnetteAction(action: AnnetteAction) {
  switch (action.type) {
    case 'create_requirement':
      return await managerTools.createRequirement({
        description: action.params.description,
        contextId: action.params.contextId,
        projectId: action.params.projectId,
        projectPath: action.params.projectPath,
      });

    case 'accept_implementation':
      return await managerTools.acceptImplementation(
        action.params.logId
      );

    case 'get_plan':
      return await managerTools.getPlan({
        description: action.params.description,
        contextId: action.params.contextId,
        projectId: action.params.projectId,
      });

    // ... other actions
  }
}
```

## Natural Language Processing

Annette can detect intent from natural language:

```typescript
// In Annette's NLP layer
const intentMap = {
  'create requirement': 'create_requirement',
  'make a task': 'create_requirement',
  'generate requirement': 'create_requirement',
  'accept this': 'accept_implementation',
  'mark as done': 'accept_implementation',
  'approve implementation': 'accept_implementation',
  'show me a plan': 'get_plan',
  'what would you do': 'get_plan',
  'how would you implement': 'get_plan',
};

function detectIntent(userMessage: string): string | null {
  const lowercaseMessage = userMessage.toLowerCase();

  for (const [phrase, intent] of Object.entries(intentMap)) {
    if (lowercaseMessage.includes(phrase)) {
      return intent;
    }
  }

  return null;
}
```

## Context-Aware Suggestions

Annette can suggest actions based on current state:

```typescript
// Smart suggestions based on implementation logs
async function getSuggestions() {
  // Check for untested implementations
  const untestedResponse = await fetch('/api/implementation-logs/untested');
  const untestedData = await untestedResponse.json();

  if (untestedData.success && untestedData.data.length > 0) {
    return {
      message: `I notice you have ${untestedData.data.length} untested implementations. Would you like me to help review them?`,
      actions: [
        {
          label: 'Accept All',
          action: 'batch_accept',
          params: {
            logIds: untestedData.data.map((log: any) => log.id),
          },
        },
        {
          label: 'Review First',
          action: 'show_implementation',
          params: { logId: untestedData.data[0].id },
        },
      ],
    };
  }

  return null;
}
```

## Advanced: Batch Operations

```typescript
// Batch accept multiple implementations
export async function batchAcceptWithFeedback(logIds: string[]) {
  const { batchAcceptImplementations } = await import('@/lib/tools');

  const result = await batchAcceptImplementations(logIds);

  if (result.success) {
    return {
      success: true,
      message: `Accepted ${result.acceptedCount} implementations successfully!`,
    };
  } else {
    return {
      success: false,
      message: `Accepted ${result.acceptedCount} out of ${logIds.length}. ${result.failedIds.length} failed.`,
      failedIds: result.failedIds,
      errors: result.errors,
    };
  }
}
```

## Error Handling

```typescript
// Graceful error handling for Annette
async function safeCreateRequirement(params: any) {
  try {
    const result = await managerTools.createRequirement(params);

    if (!result.success) {
      // Provide helpful feedback
      if (result.error?.includes('project path')) {
        return {
          success: false,
          message: "I need a project path. Could you select a project first?",
          suggestedAction: 'select_project',
        };
      } else if (result.error?.includes('description')) {
        return {
          success: false,
          message: "I need more details about what you'd like me to create.",
          suggestedAction: 'ask_for_details',
        };
      } else {
        return {
          success: false,
          message: `Something went wrong: ${result.error}`,
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[Annette] Tool error:', error);
    return {
      success: false,
      message: "I encountered an unexpected error. Please try again.",
    };
  }
}
```

## Testing

```typescript
// Test Annette's tool integration
describe('Annette Manager Tools', () => {
  it('should create requirement', async () => {
    const result = await managerTools.createRequirement({
      description: 'Test requirement',
      projectPath: '/test/path',
    });

    expect(result.success).toBe(true);
    expect(result.requirementName).toBeDefined();
  });

  it('should accept implementation', async () => {
    const result = await managerTools.acceptImplementation('test-id');

    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const result = await managerTools.createRequirement({
      description: '', // Empty description
      projectPath: '/test/path',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Benefits for Annette

1. **Voice Commands** - Users can create requirements and accept implementations by voice
2. **Proactive Suggestions** - Annette can suggest actions based on current state
3. **Natural Interaction** - Simple, conversational commands
4. **Smart Context** - Uses current context automatically
5. **Error Recovery** - Graceful handling with helpful suggestions

## Next Steps

1. Add these tools to Annette's action registry
2. Train NLP model to recognize requirement creation intents
3. Add voice feedback for successful operations
4. Implement proactive suggestions based on implementation logs
5. Add batch operations UI for managing multiple implementations
