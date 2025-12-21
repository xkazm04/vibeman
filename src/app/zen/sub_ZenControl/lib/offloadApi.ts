/**
 * Offload API Client
 * Functions for interacting with the offload bridge API
 */

import {
  CreatePairingResponse,
  AcceptPairingResponse,
  PushTasksResponse,
  PullTasksResponse,
} from '@/app/db/models/offload.types';

/**
 * Generate a pairing code (Active device)
 */
export async function generatePairingCode(
  projectId: string,
  deviceName: string
): Promise<CreatePairingResponse> {
  const response = await fetch('/api/bridge/offload/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, deviceName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate pairing code');
  }

  return response.json();
}

/**
 * Check pairing status (Active device)
 */
export async function getPairingStatus(projectId: string): Promise<{
  paired: boolean;
  pair: {
    id: string;
    deviceName: string;
    deviceRole: string;
    partnerDeviceName: string;
    partnerUrl: string;
    status: string;
    lastHeartbeatAt: string | null;
  } | null;
}> {
  const response = await fetch(`/api/bridge/offload/pair?projectId=${projectId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get pairing status');
  }

  return response.json();
}

/**
 * Accept a pairing request (Passive device - calls Active's URL)
 */
export async function acceptPairing(
  activeUrl: string,
  pairingCode: string,
  projectPath: string,
  deviceName: string,
  callbackUrl: string
): Promise<AcceptPairingResponse> {
  // Call the ACTIVE device's accept endpoint
  const response = await fetch(`${activeUrl}/api/bridge/offload/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pairingCode,
      projectPath,
      deviceName,
      callbackUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to accept pairing');
  }

  return response.json();
}

/**
 * Disconnect from partner device
 */
export async function disconnect(devicePairId: string): Promise<void> {
  const response = await fetch('/api/bridge/offload/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ devicePairId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to disconnect');
  }
}

/**
 * Push tasks to passive device (Active device)
 */
export async function pushTasks(
  partnerUrl: string,
  devicePairId: string,
  tasks: Array<{
    requirementName: string;
    requirementContent: string;
    priority?: number;
  }>
): Promise<PushTasksResponse> {
  // Call the PASSIVE device's push endpoint
  const response = await fetch(`${partnerUrl}/api/bridge/offload/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ devicePairId, tasks }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to push tasks');
  }

  return response.json();
}

/**
 * Pull pending tasks (Passive device - calls Active's URL)
 */
export async function pullTasks(
  activeUrl: string,
  devicePairId: string,
  limit: number = 10
): Promise<PullTasksResponse> {
  const response = await fetch(
    `${activeUrl}/api/bridge/offload/pull?devicePairId=${devicePairId}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to pull tasks');
  }

  return response.json();
}

/**
 * Get task status (Active device - from passive)
 */
export async function getTaskStatus(
  partnerUrl: string,
  devicePairId: string
): Promise<{
  tasks: Array<{
    id: string;
    requirementName: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    resultSummary: string | null;
    errorMessage: string | null;
  }>;
  stats: {
    pending: number;
    synced: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  };
}> {
  const response = await fetch(
    `${partnerUrl}/api/bridge/offload/status?devicePairId=${devicePairId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get task status');
  }

  return response.json();
}

/**
 * Update task status (Passive device - notifies Active)
 */
export async function updateTaskStatus(
  activeUrl: string,
  taskId: string,
  status: 'running' | 'completed' | 'failed',
  extras?: {
    resultSummary?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const response = await fetch(`${activeUrl}/api/bridge/offload/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId,
      status,
      ...extras,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update task status');
  }
}

/**
 * Get this device's URL (for callback purposes)
 * In a browser context, we use window.location
 */
export function getMyUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:3000';
}
