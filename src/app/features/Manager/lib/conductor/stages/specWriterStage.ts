/**
 * Spec Writer Stage — Orchestrates spec generation from approved backlog items
 *
 * Processes each approved item through:
 *   file discovery -> Brain query -> template rendering -> file write -> DB persist
 *
 * Brain conventions are queried per-spec (inside the loop), not batched.
 */

import { v4 as uuidv4 } from 'uuid';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { renderSpec, generateSlug, deriveComplexity } from '../spec/specTemplate';
import { discoverAffectedFiles, validateAffectedFiles } from '../spec/fileDiscovery';
import { specFileManager } from '../spec/specFileManager';
import { specRepository } from '../spec/specRepository';
import type {
  SpecWriterInput,
  SpecWriterOutput,
  SpecMetadata,
  SpecRenderData,
  AcceptanceCriterion,
  CodeConvention,
  AffectedFiles,
} from '../types';

/**
 * Execute the spec writer stage for a set of approved backlog items.
 *
 * For each approved item, generates a structured markdown spec file with:
 * - ts-morph file discovery for affected files
 * - Brain-injected code conventions (per-spec query)
 * - GIVEN/WHEN/THEN acceptance criteria
 * - Complexity classification for model routing
 */
export async function executeSpecWriterStage(
  input: SpecWriterInput
): Promise<SpecWriterOutput> {
  // 1. Create spec directory
  const specDir = await specFileManager.ensureSpecDir(input.runId);

  const allSpecs: SpecMetadata[] = [];

  // 2. Process each approved item (array index = priority order)
  for (let index = 0; index < input.approvedItems.length; index++) {
    const item = input.approvedItems[index];

    // a. File discovery
    let affectedFiles: AffectedFiles;
    if (item.filePaths.length === 0) {
      affectedFiles = { create: [], modify: [], delete: [] };
    } else {
      affectedFiles = discoverAffectedFiles(input.projectPath, item.filePaths);
    }

    // b. Validate files (log warnings, don't fail)
    const validation = validateAffectedFiles(affectedFiles, input.projectPath);
    if (!validation.valid) {
      console.warn(
        `[specWriter] Validation warnings for "${item.title}":`,
        validation.errors
      );
    }

    // c. Derive complexity from effort score
    const complexity = deriveComplexity(item.effort);

    // d. Query Brain per-spec (inside the loop, not batched)
    let codeConventions: CodeConvention[] | null = null;
    try {
      const ctx = getBehavioralContext(input.projectId);

      if (ctx.hasData) {
        // e. Extract conventions from Brain insights
        const conventions: CodeConvention[] = [];
        for (const insight of ctx.topInsights) {
          conventions.push({
            rule: insight.description,
            confidence: insight.confidence >= 80 ? 'Strong pattern' : 'Emerging pattern',
            source: insight.title,
          });
          if (conventions.length >= 5) break; // Cap at 5 per spec
        }
        codeConventions = conventions.length > 0 ? conventions : null;
      }
    } catch {
      // Brain unavailable — proceed without conventions
      codeConventions = null;
    }

    // f. Build render data
    const acceptanceCriteria = deriveAcceptanceCriteria(item.description, affectedFiles);
    const approach = deriveApproach(item.title, item.description);

    const renderData: SpecRenderData = {
      title: item.title,
      goalDescription: `${input.goalContext.description}\n\nThis spec addresses: ${item.description}`,
      acceptanceCriteria,
      affectedFiles,
      approach,
      codeConventions,
      constraints: buildConstraints(item.category),
      complexity,
    };

    // g. Render spec markdown
    const markdown = renderSpec(renderData);

    // h. Generate filename
    const slug = generateSlug(item.title);
    const filename = specFileManager.formatFilename(index + 1, slug);

    // i. Write spec file
    await specFileManager.writeSpec(specDir, filename, markdown);

    // j. Persist metadata to DB
    const specMeta = specRepository.createSpec({
      id: uuidv4(),
      runId: input.runId,
      backlogItemId: item.id,
      sequenceNumber: index + 1,
      title: item.title,
      slug,
      affectedFiles,
      complexity,
    });

    allSpecs.push(specMeta);
  }

  // 3. Return spec metadata and directory
  return { specs: allSpecs, specDir };
}

/**
 * Derive acceptance criteria from the backlog item description and affected files.
 * Generates structural GIVEN/WHEN/THEN assertions since this is automated
 * (no LLM call in the spec writer itself).
 */
function deriveAcceptanceCriteria(
  description: string,
  affectedFiles: AffectedFiles
): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];

  // Always include a compilation check
  const allFiles = [...affectedFiles.create, ...affectedFiles.modify];
  if (allFiles.length > 0) {
    criteria.push({
      given: 'the implementation is complete',
      when: 'TypeScript compiles the project',
      then: `no type errors in ${allFiles.slice(0, 3).join(', ')}${allFiles.length > 3 ? ` and ${allFiles.length - 3} more files` : ''}`,
    });
  }

  // Check that created files exist after implementation
  if (affectedFiles.create.length > 0) {
    criteria.push({
      given: 'the implementation is complete',
      when: 'the filesystem is checked',
      then: `${affectedFiles.create.join(', ')} exist${affectedFiles.create.length === 1 ? 's' : ''}`,
    });
  }

  // Check that modified files still function
  if (affectedFiles.modify.length > 0) {
    criteria.push({
      given: 'the modified files are saved',
      when: 'existing tests are run',
      then: 'no regressions in previously passing tests',
    });
  }

  // Parse any GIVEN/WHEN/THEN from the description itself
  const givenWhenThenRegex = /GIVEN\s+(.+?)\s+WHEN\s+(.+?)\s+THEN\s+(.+?)(?:\n|$)/gi;
  let match;
  while ((match = givenWhenThenRegex.exec(description)) !== null) {
    criteria.push({
      given: match[1].trim(),
      when: match[2].trim(),
      then: match[3].trim(),
    });
  }

  // Ensure at least 3 criteria
  if (criteria.length < 3) {
    criteria.push({
      given: 'the changes are committed',
      when: 'the application starts',
      then: 'no runtime errors from the changed modules',
    });
  }

  // Cap at 5
  return criteria.slice(0, 5);
}

/**
 * Derive approach text from the backlog item description.
 */
function deriveApproach(title: string, description: string): string {
  // If description is substantial, use it as the approach basis
  if (description.length > 100) {
    return description;
  }
  return `Implement ${title} by modifying the affected files listed above. Follow existing codebase patterns.`;
}

/**
 * Build constraints list. Always includes baseline constraints,
 * with additional category-specific ones.
 */
function buildConstraints(category: string): string[] {
  const constraints: string[] = [
    'Do NOT modify files outside the affected files list',
    'Do NOT add new dependencies without explicit justification',
  ];

  switch (category) {
    case 'refactor':
      constraints.push('Do NOT change external behavior or public API signatures');
      break;
    case 'bugfix':
    case 'fix':
      constraints.push('Do NOT refactor unrelated code alongside the fix');
      break;
    case 'feature':
      constraints.push('Do NOT modify existing test assertions without justification');
      break;
    case 'test':
      constraints.push('Do NOT modify production code — only add or update tests');
      break;
    case 'performance':
      constraints.push('Do NOT sacrifice readability for micro-optimizations');
      break;
  }

  return constraints;
}
