import { contextRepository } from '@/app/db/repositories/context.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { logger } from '@/lib/logger';

/**
 * Fetch valid goal IDs for a project (used for validation during idea saving)
 */
export function fetchValidGoalIds(projectId: string): Set<string> {
  const validGoalIds = new Set(
    goalRepository.getGoalsByProject(projectId).map(g => g.id)
  );
  logger.info('Found valid goal IDs for validation', { count: validGoalIds.size });
  return validGoalIds;
}

/**
 * Fetch context information and count context files
 */
export function fetchContextData(contextId?: string): {
  context: ReturnType<typeof contextRepository.getContextById>;
  contextFilesCount: number;
} {
  let context = null;
  let contextFilesCount = 0;

  if (contextId) {
    logger.info('Fetching context', { contextId });
    context = contextRepository.getContextById(contextId);

    // Count context files
    if (context && context.file_paths) {
      try {
        const filePaths = JSON.parse(context.file_paths);
        contextFilesCount = Array.isArray(filePaths) ? filePaths.length : 0;
      } catch (error) {
        logger.error('Error parsing context file paths', { error });
      }
    }
    logger.info('Context files loaded', { fileCount: contextFilesCount });
  }

  return { context, contextFilesCount };
}
