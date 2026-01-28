/**
 * Device Types for Multi-Device Mesh Network
 * Used for Emulator mode and device discovery
 */

export interface DeviceCapabilities {
  can_execute: boolean;
  session_slots: number;
}

export interface RemoteDevice {
  id: string;
  device_id: string;
  device_name: string;
  device_type: 'desktop' | 'emulator';
  hostname?: string;
  capabilities: DeviceCapabilities;
  status: 'online' | 'offline' | 'busy' | 'idle';
  active_sessions: number;
  last_heartbeat_at: string;
  created_at: string;
}

export interface DeviceRegistration {
  device_id: string;
  device_name: string;
  device_type: 'desktop' | 'emulator';
  hostname?: string;
  capabilities?: DeviceCapabilities;
}

export interface DeviceHeartbeat {
  device_id: string;
  status?: 'online' | 'busy' | 'idle';
  active_sessions?: number;
}

export interface DevicePresenceEvent {
  type: 'device_online' | 'device_offline' | 'device_status_change';
  device: RemoteDevice;
}

export const DEFAULT_DEVICE_CAPABILITIES: DeviceCapabilities = {
  can_execute: true,
  session_slots: 4,
};

/**
 * Get or create a unique device ID stored in localStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-' + Math.random().toString(36).substring(2, 10);
  }

  const key = 'vibeman-device-id';
  let deviceId = localStorage.getItem(key);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

/**
 * Get or set the device display name
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Vibeman Server';
  }

  const key = 'vibeman-device-name';
  const name = localStorage.getItem(key);
  return name || getDefaultDeviceName();
}

export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vibeman-device-name', name);
}

function getDefaultDeviceName(): string {
  // Try to generate a friendly default name
  const adjectives = ['Swift', 'Calm', 'Bright', 'Bold', 'Quick', 'Wise', 'Keen', 'Cool'];
  const nouns = ['Fox', 'Bear', 'Wolf', 'Hawk', 'Owl', 'Lion', 'Tiger', 'Eagle'];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adj} ${noun}`;
}
