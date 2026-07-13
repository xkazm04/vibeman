/**
 * Direction 2 — scan notifications map into the existing bell with correct
 * severity affordances (failures are high-priority warnings), and the server
 * id is preserved so the store's id-dedup + mark-read PATCH work.
 */

import { describe, it, expect } from 'vitest';
import {
  mapScanNotification,
  mapScanNotificationSeverity,
  type ScanNotificationRow,
} from './scanNotifications';

function row(overrides: Partial<ScanNotificationRow>): ScanNotificationRow {
  return {
    id: 'n1',
    notification_type: 'scan_completed',
    title: 'Scan completed',
    message: 'generated 3 ideas',
    created_at: '2026-07-13T00:00:00.000Z',
    read: 0,
    ...overrides,
  };
}

describe('mapScanNotificationSeverity', () => {
  it('renders both failure kinds as high-priority warnings (visually distinct)', () => {
    expect(mapScanNotificationSeverity('scan_failed')).toEqual({ type: 'warning', priority: 'high' });
    expect(mapScanNotificationSeverity('auto_merge_failed')).toEqual({ type: 'warning', priority: 'high' });
  });

  it('renders successes as outcomes and starts as quiet status', () => {
    expect(mapScanNotificationSeverity('scan_completed')).toEqual({ type: 'outcome', priority: 'medium' });
    expect(mapScanNotificationSeverity('auto_merge_completed')).toEqual({ type: 'outcome', priority: 'medium' });
    expect(mapScanNotificationSeverity('scan_started')).toEqual({ type: 'status', priority: 'low' });
  });
});

describe('mapScanNotification', () => {
  it('preserves the server id and carries title/message/timestamp through', () => {
    const mapped = mapScanNotification(row({ id: 'srv-42' }));
    expect(mapped.id).toBe('srv-42');
    expect(mapped.title).toBe('Scan completed');
    expect(mapped.message).toBe('generated 3 ideas');
    expect(mapped.timestamp).toBe('2026-07-13T00:00:00.000Z');
    expect(mapped.actionable).toBe(false);
  });

  it('tags a failure row as a high warning', () => {
    const mapped = mapScanNotification(row({ notification_type: 'auto_merge_failed', title: 'Auto-merge failed' }));
    expect(mapped.type).toBe('warning');
    expect(mapped.priority).toBe('high');
  });
});
