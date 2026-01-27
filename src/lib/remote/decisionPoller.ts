/**
 * Decision Poller Module
 * Polls Supabase vibeman_commands for pending direction decisions from Butler
 * and syncs them back to the local SQLite database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from './config.server';

// Command types for direction triage
type DirectionCommandType = 'accept_direction' | 'reject_direction' | 'skip_direction';

interface VibemanCommand {
  id: string;
  command_type: DirectionCommandType;
  payload: {
    direction_id: string;
    [key: string]: unknown;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface ProcessedDecision {
  directionId: string;
  action: DirectionCommandType;
  timestamp: Date;
}

export interface PollResult {
  success: boolean;
  processed: number;
  decisions: ProcessedDecision[];
  error?: string;
}

/**
 * DecisionPoller class
 * Manages the polling interval and processes incoming direction decisions
 */
export class DecisionPoller {
  private supabase: SupabaseClient | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pollIntervalMs: number;
  private isPolling: boolean = false;

  constructor(pollIntervalMs: number = 60000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Initialize the Supabase client with current config
   */
  private initializeClient(): boolean {
    const config = getActiveRemoteConfig();
    if (!config) {
      console.warn('[DecisionPoller] Remote not configured');
      return false;
    }

    this.supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return true;
  }

  /**
   * Start automatic polling at the configured interval
   */
  start(): void {
    if (this.intervalId) {
      console.log('[DecisionPoller] Already running');
      return;
    }

    if (!this.initializeClient()) {
      console.error('[DecisionPoller] Failed to initialize - remote not configured');
      return;
    }

    console.log(`[DecisionPoller] Starting with ${this.pollIntervalMs}ms interval`);

    // Poll immediately, then at interval
    this.pollNow();

    this.intervalId = setInterval(() => {
      this.pollNow();
    }, this.pollIntervalMs);
  }

  /**
   * Stop automatic polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DecisionPoller] Stopped');
    }
  }

  /**
   * Check if the poller is currently running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Trigger an immediate poll (can be called manually)
   */
  async pollNow(): Promise<PollResult> {
    if (this.isPolling) {
      return {
        success: false,
        processed: 0,
        decisions: [],
        error: 'Poll already in progress',
      };
    }

    if (!this.supabase) {
      if (!this.initializeClient()) {
        return {
          success: false,
          processed: 0,
          decisions: [],
          error: 'Remote not configured',
        };
      }
    }

    this.isPolling = true;

    try {
      const result = await this.fetchAndProcessCommands();
      return result;
    } catch (error) {
      console.error('[DecisionPoller] Poll error:', error);
      return {
        success: false,
        processed: 0,
        decisions: [],
        error: error instanceof Error ? error.message : 'Unknown error during poll',
      };
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Fetch pending commands from Supabase and process them
   */
  private async fetchAndProcessCommands(): Promise<PollResult> {
    if (!this.supabase) {
      return {
        success: false,
        processed: 0,
        decisions: [],
        error: 'Supabase client not initialized',
      };
    }

    // Query for pending direction commands
    const { data: commands, error } = await this.supabase
      .from('vibeman_commands')
      .select('*')
      .in('command_type', ['accept_direction', 'reject_direction', 'skip_direction'])
      .eq('status', 'pending')
      .order('created_at');

    if (error) {
      console.error('[DecisionPoller] Query error:', error);
      return {
        success: false,
        processed: 0,
        decisions: [],
        error: error.message,
      };
    }

    if (!commands || commands.length === 0) {
      console.log('[DecisionPoller] No pending commands');
      return {
        success: true,
        processed: 0,
        decisions: [],
      };
    }

    console.log(`[DecisionPoller] Processing ${commands.length} commands`);

    // Process each command
    const processedDecisions: ProcessedDecision[] = [];

    // Dynamic import to avoid circular dependencies
    const { directionRepository } = await import('@/app/db/repositories/direction.repository');

    for (const command of commands as VibemanCommand[]) {
      try {
        const directionId = command.payload?.direction_id;
        if (!directionId) {
          console.warn(`[DecisionPoller] Command ${command.id} missing direction_id`);
          await this.markCommandFailed(command.id, 'Missing direction_id in payload');
          continue;
        }

        // Process based on command type
        switch (command.command_type) {
          case 'accept_direction':
            // Update direction status to accepted
            // Note: requirement_id and requirement_path are not set since Butler only triages
            directionRepository.updateDirection(directionId, { status: 'accepted' });
            console.log(`[DecisionPoller] Accepted direction: ${directionId}`);
            break;

          case 'reject_direction':
            // Update direction status to rejected
            directionRepository.rejectDirection(directionId);
            console.log(`[DecisionPoller] Rejected direction: ${directionId}`);
            break;

          case 'skip_direction':
            // Skip - no SQLite update needed (direction stays pending)
            console.log(`[DecisionPoller] Skipped direction: ${directionId}`);
            break;
        }

        // Mark command as completed in Supabase
        await this.markCommandCompleted(command.id);

        processedDecisions.push({
          directionId,
          action: command.command_type,
          timestamp: new Date(),
        });
      } catch (commandError) {
        console.error(`[DecisionPoller] Error processing command ${command.id}:`, commandError);
        await this.markCommandFailed(
          command.id,
          commandError instanceof Error ? commandError.message : 'Processing error'
        );
      }
    }

    console.log(`[DecisionPoller] Processed ${processedDecisions.length} decisions`);

    return {
      success: true,
      processed: processedDecisions.length,
      decisions: processedDecisions,
    };
  }

  /**
   * Mark a command as completed in Supabase
   */
  private async markCommandCompleted(commandId: string): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('vibeman_commands')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', commandId);

    if (error) {
      console.error(`[DecisionPoller] Failed to mark command ${commandId} as completed:`, error);
    }
  }

  /**
   * Mark a command as failed in Supabase
   */
  private async markCommandFailed(commandId: string, errorMessage: string): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('vibeman_commands')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', commandId);

    if (error) {
      console.error(`[DecisionPoller] Failed to mark command ${commandId} as failed:`, error);
    }
  }
}

// Singleton instance
let pollerInstance: DecisionPoller | null = null;

/**
 * Get the singleton poller instance
 */
export function getDecisionPoller(): DecisionPoller {
  if (!pollerInstance) {
    pollerInstance = new DecisionPoller();
  }
  return pollerInstance;
}

/**
 * Start decision polling (convenience function)
 */
export function startDecisionPolling(): void {
  getDecisionPoller().start();
}

/**
 * Stop decision polling (convenience function)
 */
export function stopDecisionPolling(): void {
  getDecisionPoller().stop();
}

/**
 * Poll decisions immediately and return result
 */
export async function pollDecisions(): Promise<PollResult> {
  return getDecisionPoller().pollNow();
}
