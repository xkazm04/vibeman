/**
 * Bridge scan-queue notifications (persisted server-side in scan_notifications)
 * into the existing NotificationBell / messageStore feed.
 *
 * The bell already renders StoredNotification items with severity affordances
 * (priority 'high' → red icon, type 'warning' → amber, 'outcome' → green). We
 * reuse those rather than building any new notification UI — scan failures map
 * to a visually-distinct warning/high, successes to outcome, progress to a
 * quiet status line.
 */

import type { StoredNotification, NotificationType, MessagePriority } from '@/stores/messageStore';

/** The scan-notification row shape the API returns (client-side subset). */
export interface ScanNotificationRow {
  id: string;
  notification_type:
    | 'scan_started'
    | 'scan_completed'
    | 'scan_failed'
    | 'auto_merge_completed'
    | 'auto_merge_failed';
  title: string;
  message: string;
  created_at: string;
  read: number;
}

/** The shape addNotification() accepts (it fills in kind/read/receivedAt/etc.). */
export type IngestibleNotification = Omit<
  StoredNotification,
  'kind' | 'read' | 'receivedAt' | 'createdAt' | 'ttl'
>;

/**
 * Map a scan-notification kind to the bell's (type, priority) pair. Failures —
 * both scan_failed and auto_merge_failed — are the ones a user must not miss,
 * so they render as high-priority warnings (red).
 */
export function mapScanNotificationSeverity(
  kind: ScanNotificationRow['notification_type']
): { type: NotificationType; priority: MessagePriority } {
  switch (kind) {
    case 'scan_failed':
    case 'auto_merge_failed':
      return { type: 'warning', priority: 'high' };
    case 'scan_completed':
    case 'auto_merge_completed':
      return { type: 'outcome', priority: 'medium' };
    case 'scan_started':
    default:
      return { type: 'status', priority: 'low' };
  }
}

/**
 * Convert a server scan-notification row into a bell-ingestible notification.
 * The server id is reused verbatim so the store's id-dedup prevents a poll from
 * ever adding the same notification twice, and so mark-read can PATCH it back.
 */
export function mapScanNotification(row: ScanNotificationRow): IngestibleNotification {
  const { type, priority } = mapScanNotificationSeverity(row.notification_type);
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type,
    priority,
    actionable: false,
    timestamp: row.created_at,
  };
}
