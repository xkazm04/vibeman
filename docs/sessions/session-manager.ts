// src/lib/claude/session-manager.ts

import { query, type Query } from '@anthropic-ai/claude-agent-sdk';
import { ContextTracker, createTrackerFromSession } from './context-tracker';
import type {
  ClaudeSession,
  TaskRequest,
  TaskOptions,
  TaskResult,
  CompactRequest,
  CompactResult,
  SDKMessage,
  SDKSystemMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  ContextInfo,
  SessionMetadata,
} from './types';

// Database interface - implement this for your DB (Prisma, Drizzle, etc.)
export interface SessionStorage {
  get(sessionId: string): Promise<ClaudeSession | null>;
  getByProject(projectId: string, userId: string): Promise<ClaudeSession[]>;
  create(session: Omit<ClaudeSession, 'id'>): Promise<ClaudeSession>;
  update(sessionId: string, data: Partial<ClaudeSession>): Promise<ClaudeSession>;
  delete(sessionId: string): Promise<void>;
}

export interface SessionManagerConfig {
  storage: SessionStorage;
  defaultModel?: 'sonnet' | 'opus' | 'haiku';
  defaultMaxTokens?: number;
  autoCompactThreshold?: number;  // Default: 80%
  workingDirectory?: string;
}

export class ClaudeSessionManager {
  private storage: SessionStorage;
  private config: SessionManagerConfig;
  private activeTrackers: Map<string, ContextTracker> = new Map();

  constructor(config: SessionManagerConfig) {
    this.storage = config.storage;
    this.config = {
      defaultModel: 'sonnet',
      defaultMaxTokens: 200000,
      autoCompactThreshold: 80,
      ...config,
    };
  }

  /**
   * Execute a task - either in a new session or resuming an existing one
   */
  async executeTask(request: TaskRequest): Promise<TaskResult> {
    const { prompt, sessionId, projectId, userId, options = {} } = request;
    
    // Determine if we're resuming or starting fresh
    let existingSession: ClaudeSession | null = null;
    let tracker: ContextTracker;
    
    if (sessionId) {
      existingSession = await this.storage.get(sessionId);
      if (!existingSession) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      tracker = this.getOrCreateTracker(sessionId, existingSession);
      
      // Check if we should auto-compact before continuing
      if (options.autoCompact !== false && 
          tracker.shouldAutoCompact(options.compactThreshold ?? this.config.autoCompactThreshold!)) {
        console.log(`[SessionManager] Auto-compacting session ${sessionId} (${tracker.getContextInfo().usagePercentage}% usage)`);
        await this.compactSession({ sessionId });
      }
    } else {
      tracker = new ContextTracker(this.config.defaultMaxTokens);
    }

    // Track the prompt tokens before sending
    tracker.addPromptTokens(prompt);

    // Build SDK options
    const sdkOptions: Parameters<typeof query>[0]['options'] = {
      model: this.mapModel(options.model ?? this.config.defaultModel!),
      maxTurns: options.maxTurns,
      allowedTools: options.allowedTools,
      disallowedTools: options.disallowedTools,
      permissionMode: options.permissionMode,
      cwd: options.workingDirectory ?? this.config.workingDirectory,
      appendSystemPrompt: options.systemPromptAppend,
    };

    // Resume or fork existing session
    if (existingSession) {
      sdkOptions.resume = existingSession.sessionId;
      if (options.forkSession) {
        sdkOptions.forkSession = true;
      }
    }

    // Execute the query
    const startTime = Date.now();
    let claudeSessionId: string | undefined;
    let result: string | undefined;
    let error: string | undefined;
    let totalCost: number | undefined;
    let apiDuration = 0;
    let turns = 0;
    let isError = false;

    try {
      const stream: Query = query({ prompt, options: sdkOptions });

      for await (const message of stream) {
        // Track all messages for context estimation
        tracker.trackMessage(message);

        if (message.type === 'system' && (message as SDKSystemMessage).subtype === 'init') {
          claudeSessionId = message.session_id;
        } else if (message.type === 'result') {
          const resultMsg = message as SDKResultMessage;
          result = resultMsg.result;
          isError = resultMsg.is_error;
          totalCost = resultMsg.total_cost_usd;
          apiDuration = resultMsg.duration_api_ms;
          turns = resultMsg.num_turns;
          
          if (resultMsg.subtype === 'error') {
            error = resultMsg.result;
          }
        }
      }
    } catch (err) {
      isError = true;
      error = err instanceof Error ? err.message : String(err);
    }

    const totalDuration = Date.now() - startTime;
    const contextInfo = tracker.getContextInfo();

    // Save or update session in storage
    if (claudeSessionId) {
      if (existingSession && !options.forkSession) {
        // Update existing session
        await this.storage.update(existingSession.id, {
          contextTokens: contextInfo.estimatedTokens,
          lastMessageAt: new Date(),
          messageCount: existingSession.messageCount + turns,
          updatedAt: new Date(),
          status: contextInfo.canContinue ? 'active' : 'compacted',
        });
      } else {
        // Create new session record
        const newSession: Omit<ClaudeSession, 'id'> = {
          sessionId: claudeSessionId,
          projectId,
          userId,
          name: this.generateSessionName(prompt),
          contextTokens: contextInfo.estimatedTokens,
          maxTokens: this.config.defaultMaxTokens!,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: turns,
          metadata: {
            model: options.model ?? this.config.defaultModel!,
            workingDirectory: options.workingDirectory,
            parentSessionId: options.forkSession ? existingSession?.sessionId : undefined,
          },
        };
        await this.storage.create(newSession);
      }

      // Store tracker for this session
      this.activeTrackers.set(claudeSessionId, tracker);
    }

    return {
      success: !isError,
      sessionId: claudeSessionId ?? sessionId ?? '',
      result: isError ? undefined : result,
      error: isError ? (error ?? 'Unknown error') : undefined,
      contextInfo,
      duration: {
        total: totalDuration,
        api: apiDuration,
      },
      cost: totalCost,
      turns,
    };
  }

  /**
   * Compact a session to reduce context size
   * 
   * Note: In headless mode, compaction is triggered by sending a special prompt
   * that asks Claude to summarize and continue. The SDK handles the actual
   * compaction internally.
   */
  async compactSession(request: CompactRequest): Promise<CompactResult> {
    const session = await this.storage.get(request.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }

    const tracker = this.getOrCreateTracker(request.sessionId, session);
    const tokensBefore = tracker.getContextInfo().estimatedTokens;

    // Compact by sending a summarization request
    // The /compact command equivalent in headless mode
    const compactPrompt = request.summaryInstructions 
      ? `Please summarize our conversation so far, focusing on: ${request.summaryInstructions}. Then continue with any pending tasks.`
      : `Please provide a brief summary of our conversation and what we've accomplished so far, then continue with any pending tasks.`;

    const result = await this.executeTask({
      prompt: compactPrompt,
      sessionId: request.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      options: {
        autoCompact: false, // Prevent recursion
        maxTurns: 1,
      },
    });

    const tokensAfter = result.contextInfo.estimatedTokens;
    const reduction = Math.round(((tokensBefore - tokensAfter) / tokensBefore) * 100);

    // Record compaction in metadata
    const updatedMetadata: SessionMetadata = {
      ...session.metadata,
      compactionHistory: [
        ...(session.metadata.compactionHistory || []),
        {
          timestamp: new Date(),
          tokensBefore,
          tokensAfter,
          summary: result.result?.substring(0, 200) ?? '',
        },
      ],
    };

    await this.storage.update(session.id, {
      contextTokens: tokensAfter,
      status: 'compacted',
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    return {
      success: result.success,
      tokensBefore,
      tokensAfter,
      reduction,
      summary: result.result ?? '',
    };
  }

  /**
   * Get or find the best session for a project
   * This allows sharing context across related tasks
   */
  async getOrCreateSession(
    projectId: string,
    userId: string,
    options?: { preferActive?: boolean; tags?: string[] }
  ): Promise<ClaudeSession | null> {
    const sessions = await this.storage.getByProject(projectId, userId);
    
    if (sessions.length === 0) {
      return null;
    }

    // Filter by status if preferActive
    let candidates = sessions;
    if (options?.preferActive) {
      candidates = sessions.filter(s => s.status === 'active');
      if (candidates.length === 0) {
        candidates = sessions; // Fall back to all sessions
      }
    }

    // Filter by tags if provided
    if (options?.tags && options.tags.length > 0) {
      const tagged = candidates.filter(s => 
        options.tags!.some(tag => s.metadata.tags?.includes(tag))
      );
      if (tagged.length > 0) {
        candidates = tagged;
      }
    }

    // Return the most recently used session
    return candidates.sort((a, b) => 
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    )[0];
  }

  /**
   * Get context info for a session without executing anything
   */
  async getSessionContext(sessionId: string): Promise<ContextInfo | null> {
    const session = await this.storage.get(sessionId);
    if (!session) {
      return null;
    }

    const tracker = this.getOrCreateTracker(sessionId, session);
    return tracker.getContextInfo();
  }

  /**
   * Start a fresh session (archive the old one if exists)
   */
  async startFreshSession(
    projectId: string,
    userId: string,
    existingSessionId?: string
  ): Promise<void> {
    if (existingSessionId) {
      const existing = await this.storage.get(existingSessionId);
      if (existing) {
        await this.storage.update(existingSessionId, {
          status: 'archived',
          updatedAt: new Date(),
        });
        this.activeTrackers.delete(existing.sessionId);
      }
    }
  }

  /**
   * List all sessions for a project with context info
   */
  async listSessions(
    projectId: string,
    userId: string
  ): Promise<Array<ClaudeSession & { contextInfo: ContextInfo }>> {
    const sessions = await this.storage.getByProject(projectId, userId);
    
    return sessions.map(session => ({
      ...session,
      contextInfo: this.getOrCreateTracker(session.sessionId, session).getContextInfo(),
    }));
  }

  /**
   * Clean up expired/old sessions
   */
  async cleanupSessions(
    projectId: string,
    userId: string,
    options?: { maxAge?: number; keepActive?: boolean }
  ): Promise<number> {
    const sessions = await this.storage.getByProject(projectId, userId);
    const maxAge = options?.maxAge ?? 7 * 24 * 60 * 60 * 1000; // 7 days default
    const now = Date.now();
    let deleted = 0;

    for (const session of sessions) {
      const age = now - session.lastMessageAt.getTime();
      const shouldDelete = age > maxAge && 
        (!options?.keepActive || session.status !== 'active');
      
      if (shouldDelete) {
        await this.storage.delete(session.id);
        this.activeTrackers.delete(session.sessionId);
        deleted++;
      }
    }

    return deleted;
  }

  // Private helpers

  private getOrCreateTracker(sessionId: string, session: ClaudeSession): ContextTracker {
    let tracker = this.activeTrackers.get(sessionId);
    if (!tracker) {
      tracker = createTrackerFromSession(session.contextTokens, session.maxTokens);
      this.activeTrackers.set(sessionId, tracker);
    }
    return tracker;
  }

  private mapModel(model: 'sonnet' | 'opus' | 'haiku'): string {
    const modelMap = {
      sonnet: 'claude-sonnet-4-5-20250929',
      opus: 'claude-opus-4-5-20251101',
      haiku: 'claude-haiku-4-5-20251001',
    };
    return modelMap[model];
  }

  private generateSessionName(prompt: string): string {
    // Generate a name from the first prompt
    const words = prompt.split(/\s+/).slice(0, 5).join(' ');
    return words.length > 50 ? words.substring(0, 50) + '...' : words;
  }
}
