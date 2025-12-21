/**
 * Cross-Device Offload Repository
 * Handles database operations for device pairing and task offloading
 */

import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import {
  DbDevicePair,
  DbOffloadTask,
  DeviceRole,
  PairingStatus,
  OffloadTaskStatus,
} from '../models/offload.types';

// ============================================================================
// DEVICE PAIRS REPOSITORY
// ============================================================================

export const devicePairRepository = {
  /**
   * Get all device pairs for a project
   */
  getByProjectId(projectId: string): DbDevicePair[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM device_pairs
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDevicePair[];
  },

  /**
   * Get active pair for a project
   */
  getActivePair(projectId: string): DbDevicePair | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM device_pairs
      WHERE project_id = ? AND status = 'paired'
      LIMIT 1
    `);
    return (stmt.get(projectId) as DbDevicePair) || null;
  },

  /**
   * Get a device pair by ID
   */
  getById(id: string): DbDevicePair | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM device_pairs WHERE id = ?');
    return (stmt.get(id) as DbDevicePair) || null;
  },

  /**
   * Get a device pair by pairing code
   */
  getByPairingCode(code: string): DbDevicePair | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM device_pairs
      WHERE pairing_code = ? AND status = 'pending'
    `);
    return (stmt.get(code) as DbDevicePair) || null;
  },

  /**
   * Create a new device pair (generates pairing code)
   */
  create(data: {
    projectId: string;
    deviceName: string;
    deviceRole: DeviceRole;
  }): DbDevicePair {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = uuidv4();
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();

    const stmt = db.prepare(`
      INSERT INTO device_pairs (
        id, project_id, device_name, device_role, pairing_code,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.projectId,
      data.deviceName,
      data.deviceRole,
      pairingCode,
      'pending',
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Update device pair to paired status
   */
  pair(
    id: string,
    partnerUrl: string,
    partnerDeviceName: string
  ): DbDevicePair | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE device_pairs
      SET status = 'paired',
          partner_url = ?,
          partner_device_name = ?,
          pairing_code = NULL,
          last_heartbeat_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(partnerUrl, partnerDeviceName, now, now, id);
    if (result.changes === 0) return null;

    return this.getById(id);
  },

  /**
   * Update heartbeat timestamp
   */
  updateHeartbeat(id: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE device_pairs
      SET last_heartbeat_at = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, now, id);
    return result.changes > 0;
  },

  /**
   * Disconnect a device pair
   */
  disconnect(id: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE device_pairs
      SET status = 'disconnected', updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, id);
    return result.changes > 0;
  },

  /**
   * Delete a device pair
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM device_pairs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Clean up expired pending pairs (older than 5 minutes)
   */
  cleanupExpired(): number {
    const db = getDatabase();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM device_pairs
      WHERE status = 'pending' AND created_at < ?
    `);

    const result = stmt.run(fiveMinutesAgo);
    return result.changes;
  },
};

// ============================================================================
// OFFLOAD QUEUE REPOSITORY
// ============================================================================

export const offloadQueueRepository = {
  /**
   * Get all tasks for a device pair
   */
  getByDevicePairId(devicePairId: string): DbOffloadTask[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM offload_queue
      WHERE device_pair_id = ?
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(devicePairId) as DbOffloadTask[];
  },

  /**
   * Get pending tasks for a device pair (to be pulled by passive)
   */
  getPending(devicePairId: string, limit: number = 10): DbOffloadTask[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM offload_queue
      WHERE device_pair_id = ? AND status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    return stmt.all(devicePairId, limit) as DbOffloadTask[];
  },

  /**
   * Get a task by ID
   */
  getById(id: string): DbOffloadTask | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM offload_queue WHERE id = ?');
    return (stmt.get(id) as DbOffloadTask) || null;
  },

  /**
   * Create a new offload task
   */
  create(data: {
    devicePairId: string;
    projectId: string;
    requirementName: string;
    requirementContent: string;
    contextPath?: string;
    priority?: number;
  }): DbOffloadTask {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO offload_queue (
        id, device_pair_id, project_id, requirement_name, requirement_content,
        context_path, status, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.devicePairId,
      data.projectId,
      data.requirementName,
      data.requirementContent,
      data.contextPath || null,
      'pending',
      data.priority ?? 5,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Create multiple tasks at once
   */
  createMany(
    tasks: Array<{
      devicePairId: string;
      projectId: string;
      requirementName: string;
      requirementContent: string;
      contextPath?: string;
      priority?: number;
    }>
  ): string[] {
    const db = getDatabase();
    const now = new Date().toISOString();
    const ids: string[] = [];

    const stmt = db.prepare(`
      INSERT INTO offload_queue (
        id, device_pair_id, project_id, requirement_name, requirement_content,
        context_path, status, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: typeof tasks) => {
      for (const data of items) {
        const id = uuidv4();
        stmt.run(
          id,
          data.devicePairId,
          data.projectId,
          data.requirementName,
          data.requirementContent,
          data.contextPath || null,
          'pending',
          data.priority ?? 5,
          now
        );
        ids.push(id);
      }
    });

    insertMany(tasks);
    return ids;
  },

  /**
   * Mark task as synced (pulled by passive device)
   */
  markSynced(id: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE offload_queue
      SET status = 'synced', synced_at = ?
      WHERE id = ? AND status = 'pending'
    `);

    const result = stmt.run(now, id);
    return result.changes > 0;
  },

  /**
   * Mark multiple tasks as synced
   */
  markManySynced(ids: string[]): number {
    if (ids.length === 0) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');

    const stmt = db.prepare(`
      UPDATE offload_queue
      SET status = 'synced', synced_at = ?
      WHERE id IN (${placeholders}) AND status = 'pending'
    `);

    const result = stmt.run(now, ...ids);
    return result.changes;
  },

  /**
   * Update task status
   */
  updateStatus(
    id: string,
    status: OffloadTaskStatus,
    extras?: {
      resultSummary?: string;
      errorMessage?: string;
    }
  ): DbOffloadTask | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    let query = 'UPDATE offload_queue SET status = ?';
    const values: (string | null)[] = [status];

    if (status === 'running') {
      query += ', started_at = ?';
      values.push(now);
    } else if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?';
      values.push(now);
    }

    if (extras?.resultSummary !== undefined) {
      query += ', result_summary = ?';
      values.push(extras.resultSummary);
    }

    if (extras?.errorMessage !== undefined) {
      query += ', error_message = ?';
      values.push(extras.errorMessage);
    }

    query += ' WHERE id = ?';
    values.push(id);

    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) return null;
    return this.getById(id);
  },

  /**
   * Get task statistics for a device pair
   */
  getStats(devicePairId: string): {
    pending: number;
    synced: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM offload_queue
      WHERE device_pair_id = ?
      GROUP BY status
    `);
    const results = stmt.all(devicePairId) as Array<{ status: string; count: number }>;

    const stats = {
      pending: 0,
      synced: 0,
      running: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of results) {
      if (row.status in stats) {
        (stats as any)[row.status] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  },

  /**
   * Delete a task
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM offload_queue WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all tasks for a device pair
   */
  deleteByDevicePair(devicePairId: string): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM offload_queue WHERE device_pair_id = ?');
    const result = stmt.run(devicePairId);
    return result.changes;
  },
};
