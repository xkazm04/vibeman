/**
 * Bridge Event Emitter
 * In-memory event bus for SSE connections
 * Broadcasts events to connected clients
 * Also persists events to Supabase for cross-device access
 */

import { BridgeClient, BridgeEvent, BridgeEventType } from './types';
import { isSupabaseConfigured, createSupabaseClient } from '@/lib/supabase/client';

class BridgeEventEmitter {
  private clients: Map<string, BridgeClient> = new Map();
  private encoder = new TextEncoder();

  /**
   * Register a new SSE client
   */
  subscribe(
    clientId: string,
    projectId: string,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): void {
    const client: BridgeClient = {
      id: clientId,
      projectId,
      connectedAt: new Date(),
      lastPing: new Date(),
      controller,
    };

    this.clients.set(clientId, client);
    console.log(`[BridgeEventEmitter] Client ${clientId} subscribed to project ${projectId}`);

    // Send connection established event
    this.sendToClient(client, {
      type: 'connection_established',
      payload: { clientId, projectId },
      timestamp: new Date().toISOString(),
      projectId,
    });
  }

  /**
   * Remove a client subscription
   */
  unsubscribe(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[BridgeEventEmitter] Client ${clientId} unsubscribed`);
    }
  }

  /**
   * Emit event to all connected clients
   * Also persists to Supabase for cross-device access
   */
  emit<T>(type: BridgeEventType, payload: T, projectId: string, deviceId?: string): void {
    const event: BridgeEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      projectId,
    };

    // Emit to local SSE clients
    this.emitToProject(projectId, event);

    // Persist to Supabase for cross-device access (fire and forget)
    this.persistToSupabase(type, payload, projectId, deviceId);
  }

  /**
   * Persist event to Supabase bridge_events table
   */
  private async persistToSupabase<T>(
    type: BridgeEventType,
    payload: T,
    projectId: string,
    deviceId?: string
  ): Promise<void> {
    try {
      if (!isSupabaseConfigured()) return;

      const supabase = createSupabaseClient();

      await supabase.from('bridge_events').insert({
        project_id: projectId,
        device_id: deviceId || null,
        event_type: type,
        payload: payload as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Silently fail - don't break local SSE functionality
      console.warn('[BridgeEventEmitter] Failed to persist to Supabase:', error);
    }
  }

  /**
   * Emit event to all clients subscribed to a specific project
   */
  emitToProject<T>(projectId: string, event: BridgeEvent<T>): void {
    let sentCount = 0;
    const failedClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.projectId === projectId || client.projectId === '*') {
        try {
          this.sendToClient(client, event);
          sentCount++;
        } catch (error) {
          console.error(`[BridgeEventEmitter] Failed to send to client ${clientId}:`, error);
          failedClients.push(clientId);
        }
      }
    });

    // Clean up failed clients
    failedClients.forEach((clientId) => this.unsubscribe(clientId));

    if (sentCount > 0) {
      console.log(`[BridgeEventEmitter] Emitted ${event.type} to ${sentCount} client(s)`);
    }
  }

  /**
   * Broadcast event to all connected clients regardless of project
   */
  broadcast<T>(event: BridgeEvent<T>): void {
    const failedClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      try {
        this.sendToClient(client, event);
      } catch (error) {
        console.error(`[BridgeEventEmitter] Failed to broadcast to client ${clientId}:`, error);
        failedClients.push(clientId);
      }
    });

    // Clean up failed clients
    failedClients.forEach((clientId) => this.unsubscribe(clientId));
  }

  /**
   * Send event to a specific client
   */
  private sendToClient<T>(client: BridgeClient, event: BridgeEvent<T>): void {
    const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    client.controller.enqueue(this.encoder.encode(data));
    client.lastPing = new Date();
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients for a specific project
   */
  getProjectClients(projectId: string): BridgeClient[] {
    const clients: BridgeClient[] = [];
    this.clients.forEach((client) => {
      if (client.projectId === projectId || client.projectId === '*') {
        clients.push(client);
      }
    });
    return clients;
  }

  /**
   * Send ping to all clients to keep connections alive
   */
  pingAll(): void {
    const now = new Date();
    this.clients.forEach((client) => {
      try {
        const ping = `: ping ${now.toISOString()}\n\n`;
        client.controller.enqueue(this.encoder.encode(ping));
        client.lastPing = now;
      } catch {
        // Client disconnected, will be cleaned up
      }
    });
  }

  /**
   * Clean up stale connections (no ping response in 60 seconds)
   */
  cleanupStale(): void {
    const staleThreshold = 60000; // 60 seconds
    const now = Date.now();
    const staleClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing.getTime() > staleThreshold) {
        staleClients.push(clientId);
      }
    });

    staleClients.forEach((clientId) => {
      console.log(`[BridgeEventEmitter] Cleaning up stale client ${clientId}`);
      this.unsubscribe(clientId);
    });
  }
}

// Singleton instance
export const bridgeEvents = new BridgeEventEmitter();

// Start periodic ping (every 30 seconds)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    bridgeEvents.pingAll();
  }, 30000);

  // Cleanup stale connections every minute
  setInterval(() => {
    bridgeEvents.cleanupStale();
  }, 60000);
}
