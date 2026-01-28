/**
 * Remote Command Processor
 * Polls Supabase for pending commands and dispatches to handlers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  RemoteCommand,
  RemoteCommandType,
  CommandStatus,
  CommandHandler,
  CommandHandlerResult,
} from './types';

class RemoteCommandProcessor {
  private supabase: SupabaseClient | null = null;
  private handlers: Map<RemoteCommandType, CommandHandler> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private isConfigured = false;
  private localDeviceId: string | null = null;

  /**
   * Configure with Supabase credentials
   */
  configure(url: string, serviceRoleKey: string): void {
    this.supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    this.isConfigured = true;
    console.log('[RemoteCommandProcessor] Configured successfully');
  }

  /**
   * Check if processor is ready
   */
  isReady(): boolean {
    return this.isConfigured && this.supabase !== null;
  }

  /**
   * Set the local device ID for filtering commands
   * Only processes commands targeted at this device (or with null target)
   */
  setLocalDeviceId(deviceId: string): void {
    this.localDeviceId = deviceId;
    console.log(`[RemoteCommandProcessor] Local device ID set: ${deviceId}`);
  }

  /**
   * Get the local device ID
   */
  getLocalDeviceId(): string | null {
    return this.localDeviceId;
  }

  /**
   * Register a handler for a command type
   */
  registerHandler(commandType: RemoteCommandType, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
    console.log(`[RemoteCommandProcessor] Registered handler for: ${commandType}`);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(commandType: RemoteCommandType): void {
    this.handlers.delete(commandType);
  }

  /**
   * Get registered command types
   */
  getRegisteredCommands(): RemoteCommandType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Start polling for commands
   */
  startPolling(intervalMs: number = 5000): void {
    if (this.pollInterval) {
      console.log('[RemoteCommandProcessor] Already polling');
      return;
    }

    if (!this.isReady()) {
      console.warn('[RemoteCommandProcessor] Not configured, cannot start polling');
      return;
    }

    console.log(`[RemoteCommandProcessor] Starting polling every ${intervalMs}ms`);

    this.pollInterval = setInterval(() => {
      this.processPendingCommands();
    }, intervalMs);

    // Process immediately on start
    this.processPendingCommands();
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[RemoteCommandProcessor] Stopped polling');
    }
  }

  /**
   * Check if currently polling
   */
  isPolling(): boolean {
    return this.pollInterval !== null;
  }

  /**
   * Process all pending commands (can be called manually)
   * Filters by target_device_id:
   * - null/undefined: any device can process
   * - specific ID: only that device processes
   */
  async processPendingCommands(): Promise<number> {
    if (!this.supabase || this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Build query for pending commands
      let query = this.supabase
        .from('vibeman_commands')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      // Filter by target device if local device ID is set
      // Process commands that either:
      // 1. Have no target (null) - any device can process
      // 2. Are specifically targeted at this device
      if (this.localDeviceId) {
        // Use OR filter: target_device_id is null OR equals localDeviceId
        query = query.or(`target_device_id.is.null,target_device_id.eq.${this.localDeviceId}`);
      }

      const { data: commands, error } = await query;

      if (error) {
        console.warn('[RemoteCommandProcessor] Failed to fetch commands:', error.message);
        return 0;
      }

      if (!commands || commands.length === 0) {
        return 0;
      }

      console.log(`[RemoteCommandProcessor] Processing ${commands.length} commands`);

      for (const command of commands) {
        await this.processCommand(command as RemoteCommand);
        processedCount++;
      }
    } catch (err) {
      console.error('[RemoteCommandProcessor] Error processing commands:', err);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Process a single command
   */
  private async processCommand(command: RemoteCommand): Promise<void> {
    const commandType = command.command_type as RemoteCommandType;
    const handler = this.handlers.get(commandType);

    // Mark as processing
    await this.updateCommandStatus(command.id!, 'processing');

    if (!handler) {
      console.warn(`[RemoteCommandProcessor] No handler for: ${commandType}`);
      await this.updateCommandStatus(command.id!, 'failed', {
        error_message: `No handler registered for command type: ${commandType}`,
      });
      return;
    }

    try {
      console.log(`[RemoteCommandProcessor] Executing: ${commandType} (${command.id})`);
      const result = await handler(command);

      if (result.success) {
        await this.updateCommandStatus(command.id!, 'completed', {
          result: result.result,
        });
        console.log(`[RemoteCommandProcessor] Completed: ${commandType} (${command.id})`);
      } else {
        await this.updateCommandStatus(command.id!, 'failed', {
          error_message: result.error || 'Handler returned failure',
        });
        console.warn(`[RemoteCommandProcessor] Failed: ${commandType} - ${result.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await this.updateCommandStatus(command.id!, 'failed', {
        error_message: errorMessage,
      });
      console.error(`[RemoteCommandProcessor] Exception in handler: ${errorMessage}`);
    }
  }

  /**
   * Update command status in Supabase
   */
  private async updateCommandStatus(
    commandId: string,
    status: CommandStatus,
    extra?: { error_message?: string; result?: Record<string, unknown> }
  ): Promise<void> {
    if (!this.supabase) return;

    const update: Record<string, unknown> = {
      status,
      ...(status !== 'processing' && { processed_at: new Date().toISOString() }),
      ...extra,
    };

    const { error } = await this.supabase
      .from('vibeman_commands')
      .update(update)
      .eq('id', commandId);

    if (error) {
      console.warn(`[RemoteCommandProcessor] Failed to update status: ${error.message}`);
    }
  }

  /**
   * Get command by ID
   */
  async getCommand(commandId: string): Promise<RemoteCommand | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('vibeman_commands')
      .select('*')
      .eq('id', commandId)
      .single();

    if (error) {
      console.warn(`[RemoteCommandProcessor] Failed to get command: ${error.message}`);
      return null;
    }

    return data as RemoteCommand;
  }

  /**
   * Get pending command count
   */
  async getPendingCount(): Promise<number> {
    if (!this.supabase) return 0;

    const { count, error } = await this.supabase
      .from('vibeman_commands')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.warn(`[RemoteCommandProcessor] Failed to get count: ${error.message}`);
      return 0;
    }

    return count || 0;
  }
}

// Singleton instance
let instance: RemoteCommandProcessor | null = null;

export function getRemoteCommandProcessor(): RemoteCommandProcessor {
  if (!instance) {
    instance = new RemoteCommandProcessor();
  }
  return instance;
}

// Default export for convenience
export const commandProcessor = getRemoteCommandProcessor();
