/**
 * Supabase Realtime Client
 * Manages real-time subscriptions for cross-device Zen mode communication
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  DeviceRole,
  DeviceCapabilities,
  PresenceState,
  TaskBroadcast,
  EventBroadcast,
  PairingState,
  RealtimeConnectionState,
  DbDeviceSession,
  DbOffloadTask,
  DbBridgeEvent,
} from './realtimeTypes';

// ============================================================================
// Constants
// ============================================================================

const DEVICE_ID_KEY = 'vibeman_device_id';
const DEVICE_NAME_KEY = 'vibeman_device_name';
const CHANNEL_PREFIX = 'vibeman';

// ============================================================================
// Device ID Management
// ============================================================================

/**
 * Get or create a persistent device ID
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return `server-${Date.now()}`;
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get stored device name or generate default
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Server';
  }

  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    // Generate a friendly name
    const adjectives = ['Swift', 'Brave', 'Calm', 'Eager', 'Noble'];
    const nouns = ['Fox', 'Bear', 'Owl', 'Wolf', 'Hawk'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    name = `${adj} ${noun}`;
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
  return name;
}

/**
 * Set device name
 */
export function setDeviceName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
}

/**
 * Generate a 6-digit pairing code
 */
export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================================
// Supabase Configuration Check
// ============================================================================

export function isSupabaseRealtimeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ============================================================================
// Realtime Client Class
// ============================================================================

export interface RealtimeConfig {
  projectId: string;
  deviceName?: string;
  role: DeviceRole;
  capabilities?: DeviceCapabilities;
}

export type PresenceCallback = (devices: Map<string, PresenceState>) => void;
export type TaskCallback = (task: TaskBroadcast) => void;
export type EventCallback = (event: EventBroadcast) => void;
export type ConnectionCallback = (state: RealtimeConnectionState) => void;

export class VibemanRealtime {
  private supabase: SupabaseClient | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private taskChannel: RealtimeChannel | null = null;
  private eventChannel: RealtimeChannel | null = null;

  private config: RealtimeConfig | null = null;
  private deviceId: string;
  private sessionId: string | null = null;

  private onlineDevices: Map<string, PresenceState> = new Map();
  private pairing: PairingState = {
    status: 'unpaired',
    pairingCode: null,
    partnerId: null,
    partnerName: null,
  };
  private connectionState: RealtimeConnectionState = {
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnectedAt: null,
  };

  // Callbacks
  private presenceCallbacks: Set<PresenceCallback> = new Set();
  private taskCallbacks: Set<TaskCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();

  constructor() {
    this.deviceId = getOrCreateDeviceId();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Initialize and connect to Supabase Realtime
   */
  async connect(config: RealtimeConfig): Promise<boolean> {
    if (!isSupabaseRealtimeConfigured()) {
      this.setConnectionState({
        isConnected: false,
        isConnecting: false,
        error: 'Supabase not configured',
        lastConnectedAt: null,
      });
      return false;
    }

    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      return this.connectionState.isConnected;
    }

    this.config = config;
    this.setConnectionState({ ...this.connectionState, isConnecting: true, error: null });

    try {
      // Create Supabase client
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Register device in database
      await this.registerDevice();

      // Setup channels
      await this.setupPresenceChannel();
      await this.setupTaskChannel();
      await this.setupEventChannel();

      this.setConnectionState({
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnectedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('[Realtime] Connection failed:', error);
      this.setConnectionState({
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        lastConnectedAt: null,
      });
      return false;
    }
  }

  /**
   * Disconnect from all channels
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from channels
    if (this.presenceChannel) {
      await this.supabase?.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    if (this.taskChannel) {
      await this.supabase?.removeChannel(this.taskChannel);
      this.taskChannel = null;
    }
    if (this.eventChannel) {
      await this.supabase?.removeChannel(this.eventChannel);
      this.eventChannel = null;
    }

    // Mark device as offline in database
    await this.unregisterDevice();

    // Reset state
    this.onlineDevices.clear();
    this.pairing = {
      status: 'unpaired',
      pairingCode: null,
      partnerId: null,
      partnerName: null,
    };
    this.setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastConnectedAt: null,
    });
  }

  // ============================================================================
  // Device Registration
  // ============================================================================

  private async registerDevice(): Promise<void> {
    if (!this.supabase || !this.config) return;

    const deviceName = this.config.deviceName || getDeviceName();
    const capabilities = this.config.capabilities || {
      canExecute: true,
      hasClaudeCode: true,
    };

    const { data, error } = await this.supabase
      .from('device_sessions')
      .upsert({
        device_id: this.deviceId,
        device_name: deviceName,
        project_id: this.config.projectId,
        role: this.config.role,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        capabilities,
      }, {
        onConflict: 'device_id',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Realtime] Failed to register device:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to register device: ${error.message || error.code || 'Unknown error'}`);
    }

    this.sessionId = data.id;
  }

  private async unregisterDevice(): Promise<void> {
    if (!this.supabase) return;

    await this.supabase
      .from('device_sessions')
      .update({ is_online: false })
      .eq('device_id', this.deviceId);
  }

  // ============================================================================
  // Channel Setup
  // ============================================================================

  private async setupPresenceChannel(): Promise<void> {
    if (!this.supabase || !this.config) return;

    const channelName = `${CHANNEL_PREFIX}:presence:${this.config.projectId}`;

    this.presenceChannel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: this.deviceId,
        },
      },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState() ?? {};
        this.handlePresenceSync(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[Realtime] Device joined: ${key}`, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`[Realtime] Device left: ${key}`);
        this.onlineDevices.delete(key);
        this.notifyPresenceChange();
      });

    await this.presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence
        await this.presenceChannel?.track({
          deviceId: this.deviceId,
          deviceName: this.config?.deviceName || getDeviceName(),
          projectId: this.config?.projectId,
          role: this.config?.role,
          capabilities: this.config?.capabilities || { canExecute: true, hasClaudeCode: true },
          onlineAt: new Date().toISOString(),
        } as PresenceState);
      }
    });
  }

  private handlePresenceSync(state: Record<string, Array<{ [key: string]: unknown }>>): void {
    this.onlineDevices.clear();

    for (const [key, presences] of Object.entries(state)) {
      if (presences.length > 0) {
        // The presence payload contains our tracked PresenceState
        const presence = presences[0] as unknown as PresenceState;
        if (presence.deviceId) {
          this.onlineDevices.set(key, presence);
        }
      }
    }

    this.notifyPresenceChange();
  }

  private async setupTaskChannel(): Promise<void> {
    if (!this.supabase || !this.config) return;

    const channelName = `${CHANNEL_PREFIX}:tasks:${this.config.projectId}`;

    this.taskChannel = this.supabase.channel(channelName);

    this.taskChannel
      .on('broadcast', { event: 'task' }, ({ payload }) => {
        this.handleTaskBroadcast(payload as TaskBroadcast);
      });

    await this.taskChannel.subscribe();
  }

  private handleTaskBroadcast(task: TaskBroadcast): void {
    this.taskCallbacks.forEach((callback) => callback(task));
  }

  private async setupEventChannel(): Promise<void> {
    if (!this.supabase || !this.config) return;

    const channelName = `${CHANNEL_PREFIX}:events:${this.config.projectId}`;

    this.eventChannel = this.supabase.channel(channelName);

    this.eventChannel
      .on('broadcast', { event: '*' }, ({ payload }) => {
        this.handleEventBroadcast(payload as EventBroadcast);
      });

    await this.eventChannel.subscribe();
  }

  private handleEventBroadcast(event: EventBroadcast): void {
    this.eventCallbacks.forEach((callback) => callback(event));
  }

  // ============================================================================
  // Pairing
  // ============================================================================

  /**
   * Generate a pairing code for other devices to connect
   */
  async generatePairingCode(): Promise<string | null> {
    if (!this.supabase) return null;

    const code = generatePairingCode();

    const { error } = await this.supabase
      .from('device_sessions')
      .update({ pairing_code: code })
      .eq('device_id', this.deviceId);

    if (error) {
      console.error('[Realtime] Failed to set pairing code:', error);
      return null;
    }

    this.pairing = {
      status: 'waiting',
      pairingCode: code,
      partnerId: null,
      partnerName: null,
    };

    return code;
  }

  /**
   * Attempt to pair with a device using their pairing code
   */
  async pairWithCode(code: string): Promise<boolean> {
    if (!this.supabase) return false;

    // Find device with this pairing code
    const { data: partner, error } = await this.supabase
      .from('device_sessions')
      .select('device_id, device_name')
      .eq('pairing_code', code)
      .eq('is_online', true)
      .single();

    if (error || !partner) {
      console.error('[Realtime] Invalid pairing code or device offline');
      return false;
    }

    // Update both devices
    const updates = [
      this.supabase
        .from('device_sessions')
        .update({ partner_device_id: partner.device_id, pairing_code: null })
        .eq('device_id', this.deviceId),
      this.supabase
        .from('device_sessions')
        .update({ partner_device_id: this.deviceId, pairing_code: null })
        .eq('device_id', partner.device_id),
    ];

    await Promise.all(updates);

    this.pairing = {
      status: 'paired',
      pairingCode: null,
      partnerId: partner.device_id,
      partnerName: partner.device_name,
    };

    return true;
  }

  /**
   * Disconnect from paired device
   */
  async unpair(): Promise<void> {
    if (!this.supabase || !this.pairing.partnerId) return;

    await this.supabase
      .from('device_sessions')
      .update({ partner_device_id: null })
      .or(`device_id.eq.${this.deviceId},device_id.eq.${this.pairing.partnerId}`);

    this.pairing = {
      status: 'unpaired',
      pairingCode: null,
      partnerId: null,
      partnerName: null,
    };
  }

  // ============================================================================
  // Task Operations
  // ============================================================================

  /**
   * Create and broadcast a new offload task
   */
  async createTask(
    requirementName: string,
    requirementContent: string,
    options?: {
      contextPath?: string;
      targetDeviceId?: string;
      priority?: number;
    }
  ): Promise<string | null> {
    if (!this.supabase || !this.config) return null;

    const { data, error } = await this.supabase
      .from('offload_tasks')
      .insert({
        project_id: this.config.projectId,
        source_device_id: this.deviceId,
        target_device_id: options?.targetDeviceId || this.pairing.partnerId,
        requirement_name: requirementName,
        requirement_content: requirementContent,
        context_path: options?.contextPath,
        priority: options?.priority ?? 5,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Realtime] Failed to create task:', error);
      return null;
    }

    // Broadcast to channel
    await this.taskChannel?.send({
      type: 'broadcast',
      event: 'task',
      payload: {
        type: 'task:new',
        taskId: data.id,
        deviceId: this.deviceId,
      } as TaskBroadcast,
    });

    return data.id;
  }

  /**
   * Claim a pending task
   */
  async claimTask(taskId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('offload_tasks')
      .update({
        status: 'claimed',
        target_device_id: this.deviceId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('status', 'pending');

    if (error) {
      console.error('[Realtime] Failed to claim task:', error);
      return false;
    }

    await this.taskChannel?.send({
      type: 'broadcast',
      event: 'task',
      payload: {
        type: 'task:claimed',
        taskId,
        deviceId: this.deviceId,
      } as TaskBroadcast,
    });

    return true;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: DbOffloadTask['status'],
    options?: {
      resultSummary?: string;
      errorMessage?: string;
    }
  ): Promise<boolean> {
    if (!this.supabase) return false;

    const updates: Partial<DbOffloadTask> = { status };

    if (status === 'running') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    if (options?.resultSummary) {
      updates.result_summary = options.resultSummary;
    }
    if (options?.errorMessage) {
      updates.error_message = options.errorMessage;
    }

    const { error } = await this.supabase
      .from('offload_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('[Realtime] Failed to update task status:', error);
      return false;
    }

    await this.taskChannel?.send({
      type: 'broadcast',
      event: 'task',
      payload: {
        type: 'task:status',
        taskId,
        status,
        result: options?.resultSummary,
        error: options?.errorMessage,
      } as TaskBroadcast,
    });

    return true;
  }

  /**
   * Get pending tasks for this device
   */
  async getPendingTasks(): Promise<DbOffloadTask[]> {
    if (!this.supabase || !this.config) return [];

    const { data, error } = await this.supabase
      .from('offload_tasks')
      .select('*')
      .eq('project_id', this.config.projectId)
      .or(`target_device_id.eq.${this.deviceId},target_device_id.is.null`)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Realtime] Failed to get pending tasks:', error);
      return [];
    }

    return data || [];
  }

  // ============================================================================
  // Event Operations
  // ============================================================================

  /**
   * Broadcast an event to all connected devices
   */
  async broadcastEvent(type: string, payload: Record<string, unknown>): Promise<boolean> {
    if (!this.supabase || !this.config) return false;

    const event: EventBroadcast = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      sourceDeviceId: this.deviceId,
    };

    // Store in database
    await this.supabase
      .from('bridge_events')
      .insert({
        project_id: this.config.projectId,
        device_id: this.deviceId,
        event_type: type,
        payload,
      });

    // Broadcast to channel
    await this.eventChannel?.send({
      type: 'broadcast',
      event: type,
      payload: event,
    });

    return true;
  }

  // ============================================================================
  // Callbacks
  // ============================================================================

  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback);
    // Call immediately with current state
    callback(this.onlineDevices);
    return () => this.presenceCallbacks.delete(callback);
  }

  onTaskUpdate(callback: TaskCallback): () => void {
    this.taskCallbacks.add(callback);
    return () => this.taskCallbacks.delete(callback);
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.connectionState);
    return () => this.connectionCallbacks.delete(callback);
  }

  private notifyPresenceChange(): void {
    this.presenceCallbacks.forEach((callback) => callback(this.onlineDevices));
  }

  private setConnectionState(state: RealtimeConnectionState): void {
    this.connectionState = state;
    this.connectionCallbacks.forEach((callback) => callback(state));
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getDeviceId(): string {
    return this.deviceId;
  }

  getOnlineDevices(): Map<string, PresenceState> {
    return new Map(this.onlineDevices);
  }

  getPairing(): PairingState {
    return { ...this.pairing };
  }

  getConnectionState(): RealtimeConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  isPaired(): boolean {
    return this.pairing.status === 'paired';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let realtimeInstance: VibemanRealtime | null = null;

export function getVibemanRealtime(): VibemanRealtime {
  if (!realtimeInstance) {
    realtimeInstance = new VibemanRealtime();
  }
  return realtimeInstance;
}

export const vibemanRealtime = getVibemanRealtime();
