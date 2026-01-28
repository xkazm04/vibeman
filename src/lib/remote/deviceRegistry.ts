/**
 * Device Registry Service (Server-Only)
 * Manages device registration, heartbeats, and discovery for the mesh network
 *
 * WARNING: This file creates a Supabase client and must only be imported on the server.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from './config.server';
import type {
  RemoteDevice,
  DeviceRegistration,
  DeviceHeartbeat,
  DeviceCapabilities,
  DEFAULT_DEVICE_CAPABILITIES,
} from './deviceTypes';

class DeviceRegistry {
  private supabase: SupabaseClient | null = null;
  private deviceId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConfigured = false;

  /**
   * Configure the registry with Supabase credentials
   */
  configure(url: string, serviceRoleKey: string): void {
    this.supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    this.isConfigured = true;
    console.log('[DeviceRegistry] Configured');
  }

  /**
   * Check if the registry is ready
   */
  isReady(): boolean {
    return this.isConfigured && this.supabase !== null;
  }

  /**
   * Register this device in the mesh network
   */
  async registerDevice(registration: DeviceRegistration): Promise<RemoteDevice | null> {
    if (!this.supabase) {
      console.warn('[DeviceRegistry] Not configured');
      return null;
    }

    try {
      const capabilities = registration.capabilities || {
        can_execute: true,
        session_slots: 4,
      };

      const { data, error } = await this.supabase
        .from('vibeman_devices')
        .upsert(
          {
            device_id: registration.device_id,
            device_name: registration.device_name,
            device_type: registration.device_type,
            hostname: registration.hostname || null,
            capabilities,
            status: 'online',
            active_sessions: 0,
            last_heartbeat_at: new Date().toISOString(),
          },
          {
            onConflict: 'device_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[DeviceRegistry] Registration failed:', error.message, error.code, error.details);
        return null;
      }

      this.deviceId = registration.device_id;
      console.log('[DeviceRegistry] Device registered:', registration.device_name);

      return data as RemoteDevice;
    } catch (err) {
      console.error('[DeviceRegistry] Registration error:', err);
      return null;
    }
  }

  /**
   * Unregister this device (mark as offline)
   */
  async unregisterDevice(): Promise<void> {
    if (!this.supabase || !this.deviceId) {
      return;
    }

    try {
      await this.supabase
        .from('vibeman_devices')
        .update({
          status: 'offline',
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('device_id', this.deviceId);

      this.stopHeartbeat();
      console.log('[DeviceRegistry] Device unregistered');
    } catch (err) {
      console.error('[DeviceRegistry] Unregister error:', err);
    }
  }

  /**
   * Send a heartbeat to update device status
   */
  async sendHeartbeat(heartbeat?: Partial<DeviceHeartbeat>): Promise<boolean> {
    if (!this.supabase || !this.deviceId) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('vibeman_devices')
        .update({
          status: heartbeat?.status || 'online',
          active_sessions: heartbeat?.active_sessions ?? 0,
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('device_id', this.deviceId);

      if (error) {
        console.error('[DeviceRegistry] Heartbeat failed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[DeviceRegistry] Heartbeat error:', err);
      return false;
    }
  }

  /**
   * Start automatic heartbeats
   */
  startHeartbeat(intervalMs: number = 30000): void {
    if (this.heartbeatInterval) {
      return; // Already running
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);

    console.log('[DeviceRegistry] Heartbeat started (every', intervalMs, 'ms)');
  }

  /**
   * Stop automatic heartbeats
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[DeviceRegistry] Heartbeat stopped');
    }
  }

  /**
   * Get all online devices
   */
  async getOnlineDevices(): Promise<RemoteDevice[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      // Get devices with heartbeat within last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('vibeman_devices')
        .select('*')
        .gte('last_heartbeat_at', twoMinutesAgo)
        .neq('status', 'offline')
        .order('last_heartbeat_at', { ascending: false });

      if (error) {
        console.error('[DeviceRegistry] Get online devices failed:', error);
        return [];
      }

      return (data || []) as RemoteDevice[];
    } catch (err) {
      console.error('[DeviceRegistry] Get online devices error:', err);
      return [];
    }
  }

  /**
   * Get all devices (including offline)
   */
  async getAllDevices(): Promise<RemoteDevice[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('vibeman_devices')
        .select('*')
        .order('last_heartbeat_at', { ascending: false });

      if (error) {
        console.error('[DeviceRegistry] Get all devices failed:', error);
        return [];
      }

      return (data || []) as RemoteDevice[];
    } catch (err) {
      console.error('[DeviceRegistry] Get all devices error:', err);
      return [];
    }
  }

  /**
   * Get a specific device by ID
   */
  async getDevice(deviceId: string): Promise<RemoteDevice | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('vibeman_devices')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error) {
        console.error('[DeviceRegistry] Get device failed:', error);
        return null;
      }

      return data as RemoteDevice;
    } catch (err) {
      console.error('[DeviceRegistry] Get device error:', err);
      return null;
    }
  }

  /**
   * Update device status
   */
  async updateStatus(status: 'online' | 'offline' | 'busy' | 'idle', activeSessions?: number): Promise<boolean> {
    if (!this.supabase || !this.deviceId) {
      return false;
    }

    try {
      const update: Record<string, unknown> = {
        status,
        last_heartbeat_at: new Date().toISOString(),
      };

      if (activeSessions !== undefined) {
        update.active_sessions = activeSessions;
      }

      const { error } = await this.supabase
        .from('vibeman_devices')
        .update(update)
        .eq('device_id', this.deviceId);

      if (error) {
        console.error('[DeviceRegistry] Update status failed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[DeviceRegistry] Update status error:', err);
      return false;
    }
  }

  /**
   * Delete a device (admin operation)
   */
  async deleteDevice(deviceId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('vibeman_devices')
        .delete()
        .eq('device_id', deviceId);

      if (error) {
        console.error('[DeviceRegistry] Delete device failed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[DeviceRegistry] Delete device error:', err);
      return false;
    }
  }

  /**
   * Clean up stale devices (offline for more than 24 hours)
   */
  async cleanupStaleDevices(): Promise<number> {
    if (!this.supabase) {
      return 0;
    }

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('vibeman_devices')
        .delete()
        .lt('last_heartbeat_at', oneDayAgo)
        .eq('status', 'offline')
        .select();

      if (error) {
        console.error('[DeviceRegistry] Cleanup failed:', error);
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        console.log('[DeviceRegistry] Cleaned up', count, 'stale devices');
      }
      return count;
    } catch (err) {
      console.error('[DeviceRegistry] Cleanup error:', err);
      return 0;
    }
  }

  /**
   * Get the current device ID
   */
  getCurrentDeviceId(): string | null {
    return this.deviceId;
  }
}

// Singleton instance
export const deviceRegistry = new DeviceRegistry();

/**
 * Auto-configure if remote config is available
 */
export function initializeDeviceRegistry(): void {
  const config = getActiveRemoteConfig();
  if (config) {
    deviceRegistry.configure(config.url, config.serviceRoleKey);
  }
}
