import { ideaRepository, STALE_ARCHIVE_FEEDBACK } from '@/app/db/repositories/idea.repository';
import { scanRepository } from '@/app/db/repositories/scan.repository';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { validateScore } from '@/app/db/repositories/repository.utils';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { isNearDuplicateTitle } from '@/lib/ideas/ideaDedup';
import type { GeneratedIdea } from '../generateIdeas';

interface SaveIdeasBaseParams {
  parsedIdeas: GeneratedIdea[];
  projectId: string;
  contextId?: string;
  context: { name?: string } | null;
  effectiveScanType: ScanType;
  actualProvider: string;
  actualModel?: string;
  validGoalIds: Set<string>;
  detailed: boolean;
}

interface SaveIdeasParams extends SaveIdeasBaseParams {
  projectName: string;
}

/**
 * Create a scan record and save all parsed ideas to the database.
 * Returns the saved ideas array and the scan ID.
 */
export function createScanAndSaveIdeas(params: SaveIdeasParams & {
  inputTokens?: number;
  outputTokens?: number;
  contentHash?: string | null;
}): { savedIdeas: ReturnType<typeof ideaRepository.createIdea>[]; scanId: string; skippedDuplicates: number } {
  const {
    parsedIdeas,
    projectId,
    projectName,
    contextId,
    context,
    effectiveScanType,
    actualProvider,
    actualModel,
    validGoalIds,
    detailed,
    inputTokens,
    outputTokens,
    contentHash,
  } = params;

  // Create scan record with token tracking
  const scanId = uuidv4();
  const scanSummary = `Generated ${parsedIdeas.length} ideas for ${projectName}${contextId ? ` - Context: ${contextId}` : ''}`;

  logger.info('Creating scan record');
  scanRepository.createScan({
    id: scanId,
    project_id: projectId,
    scan_type: effectiveScanType,
    summary: scanSummary,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    provider: actualProvider,
    model: actualModel,
    context_id: contextId ?? null,
    content_hash: contentHash ?? null,
  });

  // Save ideas to database
  logger.info('Saving ideas to database');
  const { savedIdeas, skippedDuplicates } = saveIdeasToDB({
    parsedIdeas,
    scanId,
    projectId,
    contextId,
    context,
    effectiveScanType,
    actualProvider,
    actualModel,
    validGoalIds,
    detailed,
  });

  logger.info('Successfully saved ideas', { count: savedIdeas.length, skippedDuplicates });

  return { savedIdeas, scanId, skippedDuplicates };
}

/**
 * Save individual ideas to the database with field validation and normalization.
 *
 * Performs save-time near-duplicate detection: a candidate whose title closely
 * matches an already-active (pending/accepted) idea in the same context — or an
 * idea already accepted earlier in THIS batch — is skipped rather than inserted,
 * so re-scanning a context does not accrete near-identical rows.
 */
function saveIdeasToDB(params: SaveIdeasBaseParams & { scanId: string }): {
  savedIdeas: ReturnType<typeof ideaRepository.createIdea>[];
  skippedDuplicates: number;
} {
  const {
    parsedIdeas,
    scanId,
    projectId,
    contextId,
    context,
    effectiveScanType,
    actualProvider,
    actualModel,
    validGoalIds,
    detailed,
  } = params;

  // Seed the dedup set with the titles of existing ideas for this scope
  // (context if scoped, else the whole project). Grows as we accept ideas from
  // this batch so intra-batch duplicates are also caught.
  //
  // Every status seeds the set EXCEPT auto-archived (stale) rejections: a
  // user-rejected idea must not be re-pitched and an implemented one must not
  // be re-suggested, but an idea archived merely for sitting untouched may
  // legitimately resurface once its context actually changes.
  const existingActive = contextId
    ? ideaRepository.getIdeasByContext(contextId)
    : ideaRepository.getIdeasByProject(projectId);
  const seenTitles: string[] = existingActive
    .filter(i => !(i.status === 'rejected' && i.user_feedback === STALE_ARCHIVE_FEEDBACK))
    .map(i => i.title);

  let skippedDuplicates = 0;

  const savedIdeas = parsedIdeas
    .filter(idea => {
      // Skip ideas without required fields
      if (!idea.title || typeof idea.title !== 'string' || idea.title.trim() === '') {
        logger.warn('Skipping idea without valid title', { idea });
        return false;
      }
      // Skip near-duplicates of already-known ideas (programmatic dedup).
      if (isNearDuplicateTitle(idea.title, seenTitles)) {
        skippedDuplicates++;
        logger.info('Skipping near-duplicate idea', { title: idea.title });
        return false;
      }
      // Track the accepted title so later ideas in this batch dedup against it.
      seenTitles.push(idea.title);
      return true;
    })
    .map(idea => {
      const ideaId = uuidv4();

      // Ensure all required fields have valid values with fallbacks
      const category = idea.category && typeof idea.category === 'string' && idea.category.trim() !== ''
        ? idea.category.trim()
        : 'general';

      const title = idea.title.trim();
      const description = idea.description && typeof idea.description === 'string' && idea.description.trim() !== ''
        ? idea.description.trim()
        : undefined;
      // In detailed mode, merge procedure steps into reasoning for storage
      let reasoning = idea.reasoning && typeof idea.reasoning === 'string' && idea.reasoning.trim() !== ''
        ? idea.reasoning.trim()
        : undefined;

      if (detailed && Array.isArray(idea.procedure) && idea.procedure.length > 0) {
        const procedureText = '\n\n## Implementation Procedure\n' +
          idea.procedure.map((step, i) => `${i + 1}. ${step}`).join('\n');
        reasoning = (reasoning || '') + procedureText;
      }

      const effort = validateScore(idea.effort);
      const impact = validateScore(idea.impact);
      const risk = validateScore(idea.risk);

      // Validate goal_id - ensure it exists in the database
      let validatedGoalId: string | null = null;
      if (idea.goal_id && typeof idea.goal_id === 'string') {
        if (validGoalIds.has(idea.goal_id)) {
          validatedGoalId = idea.goal_id;
        } else {
          logger.warn('Invalid goal_id for idea, setting to null', { goalId: idea.goal_id, title });
          validatedGoalId = null;
        }
      }

      // Validate context_id exists in the database before inserting
      let validatedContextId: string | null = contextId || null;
      if (validatedContextId && !context) {
        logger.warn('Context ID not found in database, setting to null to prevent FK constraint failure', { contextId: validatedContextId });
        validatedContextId = null;
      }

      return ideaRepository.createIdea({
        id: ideaId,
        scan_id: scanId,
        project_id: projectId,
        context_id: validatedContextId,
        scan_type: effectiveScanType,
        category,
        title,
        description,
        reasoning,
        status: 'pending',
        effort,
        impact,
        risk,
        goal_id: validatedGoalId,
        provider: actualProvider,
        model: actualModel,
        detailed,
      });
    });

  return { savedIdeas, skippedDuplicates };
}
