import { scanQueueCoreRepository } from './scanQueue.core.repository';
import { scanNotificationRepository } from './scanNotification.repository';
import { fileWatchRepository } from './fileWatch.repository';

/**
 * Scan Queue Repository
 * Unified facade re-exporting all scan queue, notification, and file watch operations.
 * Sub-modules: scanQueue.core.repository, scanNotification.repository, fileWatch.repository
 */
export const scanQueueRepository = {
  // Queue CRUD, status/progress, scan linking, cleanup
  ...scanQueueCoreRepository,

  // Notifications
  ...scanNotificationRepository,

  // File watch config
  ...fileWatchRepository,
};
