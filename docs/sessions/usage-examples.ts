// src/examples/usage-examples.ts

/**
 * EXAMPLE 1: Basic Task Execution with Session Persistence
 * 
 * This pattern allows multiple related tasks to share context,
 * improving Claude's understanding and response quality.
 */

import { ClaudeSessionManager } from '@/lib/claude/session-manager';
import { getPrismaStorage } from '@/lib/claude/storage/prisma-storage';

const sessionManager = new ClaudeSessionManager({
  storage: getPrismaStorage(),
  defaultModel: 'sonnet',
  autoCompactThreshold: 80,
  workingDirectory: '/path/to/your/project',
});

async function example1_basicTaskExecution() {
  const projectId = 'my-project-123';
  const userId = 'user-456';

  // First task - creates a new session
  const result1 = await sessionManager.executeTask({
    prompt: 'Analyze the authentication system in src/auth and identify potential security issues',
    projectId,
    userId,
    options: {
      allowedTools: ['Read', 'Grep', 'Glob'],
    },
  });

  console.log('Session ID:', result1.sessionId);
  console.log('Context usage:', result1.contextInfo.usagePercentage, '%');

  // Second task - resumes the same session (Claude remembers the first task)
  const result2 = await sessionManager.executeTask({
    prompt: 'Now fix the issues you identified, starting with the most critical ones',
    sessionId: result1.sessionId, // Resume existing session
    projectId,
    userId,
    options: {
      allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
      permissionMode: 'acceptEdits',
    },
  });

  console.log('Fixed issues. Context usage:', result2.contextInfo.usagePercentage, '%');

  // Third task - still in same session, full context preserved
  const result3 = await sessionManager.executeTask({
    prompt: 'Write tests for the changes you just made',
    sessionId: result1.sessionId,
    projectId,
    userId,
  });

  console.log('Tests written. Total context:', result3.contextInfo.estimatedTokens, 'tokens');
}


/**
 * EXAMPLE 2: Smart Session Management for Projects
 * 
 * This pattern automatically finds and reuses the best session
 * for a given project, reducing context rebuild time.
 */

async function example2_smartSessionManagement() {
  const projectId = 'ecommerce-app';
  const userId = 'developer-1';

  // Try to find an existing active session for this project
  const existingSession = await sessionManager.getOrCreateSession(projectId, userId, {
    preferActive: true,
    tags: ['feature-development'], // Optional: filter by tags
  });

  if (existingSession) {
    console.log('Resuming existing session:', existingSession.name);
    console.log('Previous context:', existingSession.contextTokens, 'tokens');
    
    // Check if we should compact before continuing
    const contextInfo = await sessionManager.getSessionContext(existingSession.sessionId);
    if (contextInfo?.shouldCompact) {
      console.log('Session needs compaction, compacting...');
      await sessionManager.compactSession({ 
        sessionId: existingSession.sessionId,
        summaryInstructions: 'Focus on code changes and decisions made',
      });
    }
  }

  // Execute task - will use existing session or create new one
  const result = await sessionManager.executeTask({
    prompt: 'Add a shopping cart feature to the checkout page',
    sessionId: existingSession?.sessionId,
    projectId,
    userId,
  });

  console.log('Task completed in session:', result.sessionId);
}


/**
 * EXAMPLE 3: Handling Context Limits with Auto-Compaction
 * 
 * This pattern ensures long-running projects don't hit context limits
 * by automatically compacting when needed.
 */

async function example3_longRunningProject() {
  const projectId = 'data-pipeline';
  const userId = 'data-engineer';
  
  // Configuration for long-running sessions
  const longRunningOptions = {
    autoCompact: true,
    compactThreshold: 75, // Start compacting earlier for complex tasks
  };

  // Simulate multiple tasks over time
  const tasks = [
    'Design the ETL pipeline architecture for processing user events',
    'Implement the data extraction layer with proper error handling',
    'Add data transformation logic for normalizing user records',
    'Create the loading mechanism to push data to the warehouse',
    'Add monitoring and alerting for pipeline failures',
    'Optimize performance for handling 1M events/day',
    'Write documentation for the pipeline',
    'Create runbooks for common operational scenarios',
  ];

  let sessionId: string | undefined;

  for (const task of tasks) {
    console.log(`\nExecuting: ${task.substring(0, 50)}...`);
    
    const result = await sessionManager.executeTask({
      prompt: task,
      sessionId,
      projectId,
      userId,
      options: longRunningOptions,
    });

    sessionId = result.sessionId;

    console.log(`  Status: ${result.success ? 'Success' : 'Failed'}`);
    console.log(`  Context: ${result.contextInfo.usagePercentage}%`);
    
    if (result.contextInfo.shouldCompact) {
      console.log('  ⚠️  Context getting full, will auto-compact on next task');
    }
  }
}


/**
 * EXAMPLE 4: Session Forking for Experimental Changes
 * 
 * This pattern allows trying alternative approaches without
 * losing the main session context.
 */

async function example4_sessionForking() {
  const projectId = 'api-server';
  const userId = 'backend-dev';

  // Initial implementation
  const result1 = await sessionManager.executeTask({
    prompt: 'Create a REST API endpoint for user registration with email verification',
    projectId,
    userId,
  });

  console.log('Initial implementation done in session:', result1.sessionId);

  // Fork the session to try an alternative approach
  const experimentResult = await sessionManager.executeTask({
    prompt: 'Try implementing this differently using GraphQL instead of REST',
    sessionId: result1.sessionId,
    projectId,
    userId,
    options: {
      forkSession: true, // Creates a branch, original session unchanged
    },
  });

  console.log('Experiment session:', experimentResult.sessionId);
  console.log('Original session is preserved and can be continued separately');

  // Continue with original approach (original session)
  const result2 = await sessionManager.executeTask({
    prompt: 'Add rate limiting to the registration endpoint',
    sessionId: result1.sessionId, // Uses original, not the fork
    projectId,
    userId,
  });

  console.log('Continued original session:', result2.sessionId);
}


/**
 * EXAMPLE 5: React Component Integration
 * 
 * This shows how to use the hook in a React component.
 */

const ExampleComponent = `
'use client';

import { useClaudeSession } from '@/hooks/use-claude-session';
import { useState } from 'react';

export function CodeAssistant({ projectId, userId }: { projectId: string; userId: string }) {
  const [prompt, setPrompt] = useState('');
  
  const {
    sessionId,
    isLoading,
    error,
    contextInfo,
    lastResult,
    executeTask,
    compactSession,
    startFreshSession,
    loadExistingSession,
  } = useClaudeSession({
    projectId,
    userId,
    autoCompact: true,
    compactThreshold: 80,
    onContextWarning: (info) => {
      console.warn(\`Context at \${info.usagePercentage}% - consider compacting\`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      const result = await executeTask(prompt);
      console.log('Result:', result);
      setPrompt('');
    } catch (err) {
      console.error('Task failed:', err);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <span className="text-sm text-gray-500">
          Session: {sessionId ?? 'None'} | 
          Context: {contextInfo?.usagePercentage ?? 0}%
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="flex-1 p-2 border rounded"
          placeholder="Enter your task..."
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isLoading ? 'Working...' : 'Execute'}
        </button>
      </form>

      {contextInfo?.shouldCompact && (
        <button
          onClick={() => compactSession()}
          className="mt-2 text-sm text-orange-600"
        >
          ⚠️ Context high - Click to compact
        </button>
      )}

      {error && (
        <div className="mt-2 text-red-500">{error}</div>
      )}

      {lastResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap">{lastResult.result}</pre>
        </div>
      )}
    </div>
  );
}
`;


/**
 * EXAMPLE 6: Batch Processing with Session Pools
 * 
 * For processing many similar tasks efficiently.
 */

async function example6_batchProcessing() {
  const projectId = 'code-review';
  const userId = 'reviewer';

  // Files to review
  const filesToReview = [
    'src/auth/login.ts',
    'src/auth/register.ts',
    'src/api/users.ts',
    'src/api/products.ts',
  ];

  // Group related files into session batches to share context
  const batches = [
    filesToReview.slice(0, 2), // Auth files together
    filesToReview.slice(2, 4), // API files together
  ];

  const allResults = [];

  for (const batch of batches) {
    let sessionId: string | undefined;

    for (const file of batch) {
      const result = await sessionManager.executeTask({
        prompt: `Review ${file} for security issues and code quality. Be thorough but concise.`,
        sessionId, // First file creates session, rest reuse it
        projectId,
        userId,
        options: {
          allowedTools: ['Read', 'Grep'],
          maxTurns: 3,
        },
      });

      sessionId = result.sessionId;
      allResults.push({ file, result });
    }

    // Archive the batch session when done
    await sessionManager.startFreshSession(projectId, userId, sessionId);
  }

  return allResults;
}


// Export for documentation
export const examples = {
  example1_basicTaskExecution,
  example2_smartSessionManagement,
  example3_longRunningProject,
  example4_sessionForking,
  example5_reactComponent: ExampleComponent,
  example6_batchProcessing,
};
