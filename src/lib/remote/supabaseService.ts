/**
 * SupabaseService base class
 * Shared lifecycle for server-only singletons that need a Supabase client.
 * Subclasses provide domain logic; this class owns configuration and readiness.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export abstract class SupabaseService {
  protected supabase: SupabaseClient | null = null;
  private _isConfigured = false;
  private _configError: string | null = null;

  /** Human-readable label used in log messages (e.g. "DeviceRegistry"). */
  protected abstract readonly serviceName: string;

  /**
   * Configure the service with Supabase credentials.
   * Creates a server-side client with no auth persistence.
   */
  configure(url: string, serviceRoleKey: string): void {
    try {
      this.supabase = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this._isConfigured = true;
      this._configError = null;
      console.log(`[${this.serviceName}] Configured`);
    } catch (error) {
      this._configError = error instanceof Error ? error.message : 'Failed to configure';
      console.error(`[${this.serviceName}] Configuration error:`, this._configError);
    }
  }

  /** Whether the service has been configured and the client is available. */
  isReady(): boolean {
    return this._isConfigured && this.supabase !== null;
  }

  /** Returns the configuration error message, if any. */
  getConfigError(): string | null {
    return this._configError;
  }
}
