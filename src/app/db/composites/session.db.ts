/**
 * Session composite export — sessionRepository plus task helpers.
 * Lives outside the @/app/db barrel so routes can import it without
 * pulling the entire repository layer into their module graph.
 */
import { closeDatabase } from '../connection';
import {
  sessionRepository,
  sessionTaskRepository,
} from '../repositories/session.repository';

export const sessionDb = {
  ...sessionRepository,
  getTasksBySessionId: sessionTaskRepository.getBySessionId,
  getNextPending: sessionTaskRepository.getNextPending,
  getTaskById: sessionTaskRepository.getById,
  getTaskByTaskId: sessionTaskRepository.getByTaskId,
  updateTaskStatus: sessionTaskRepository.updateStatus,
  getTaskStats: sessionTaskRepository.getStats,
  tasks: sessionTaskRepository,
  close: closeDatabase,
};
