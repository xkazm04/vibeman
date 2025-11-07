/**
 * Performance Optimizer Prompt for Idea Generation
 * Focus: Speed, efficiency, and resource optimization
 */

import { JSON_SCHEMA_INSTRUCTIONS, JSON_OUTPUT_REMINDER, getCategoryGuidance } from './schemaTemplate';
import {
  buildMissionHeader,
  buildQualityRequirements,
  buildAnalysisProcess,
  buildCriticalInstructions,
  buildExpectedOutput,
  buildContextFocus,
  buildFocusArea,
  buildContentSections,
} from './promptTemplateHelpers';

interface PromptOptions {
  projectName: string;
  aiDocsSection: string;
  contextSection: string;
  existingIdeasSection: string;
  codeSection: string;
  hasContext: boolean;
}

function buildFocusAreas(): string {
  let section = '## Focus Areas for Ideas\n\n';

  section += buildFocusArea('⚡', 'Algorithm Optimization', 'Performance Category', [
    'O(n²) operations that could be O(n)',
    'Expensive nested loops',
    'Unnecessary iterations',
    'Better data structures (Set vs Array, Map vs Object)',
    'Redundant calculations',
  ]);

  section += buildFocusArea('🎯', 'Caching Opportunities', 'Performance Category', [
    'Repeated expensive computations',
    'API calls that could be cached',
    'Memoization candidates',
    'Static data that\'s recomputed',
    'Database query results',
  ]);

  section += buildFocusArea('🔄', 'Async & Parallelization', 'Performance Category', [
    'Sequential operations that could be parallel',
    'Blocking operations that could be async',
    'Promise.all() opportunities',
    'Web worker candidates',
    'Lazy loading possibilities',
  ]);

  section += buildFocusArea('💾', 'Memory Optimization', 'Performance Category', [
    'Memory leaks (event listeners, timers)',
    'Large data structures in memory',
    'Generator/streaming opportunities',
    'Unnecessary data cloning',
    'Object pooling candidates',
  ]);

  section += buildFocusArea('🗃️', 'Database & Network', 'Performance Category', [
    'N+1 query problems',
    'Missing indexes',
    'Over-fetching data',
    'Inefficient queries',
    'Bundle size optimization',
  ]);

  section += buildFocusArea('🎨', 'Rendering Performance', 'UI Category', [
    'Unnecessary re-renders',
    'Large component trees',
    'Missing React.memo/useMemo',
    'Virtual scrolling needs',
    'Layout thrashing',
  ]);

  return section;
}

export function buildPerfOptimizerPrompt(options: PromptOptions): string {
  const {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection,
    hasContext
  } = options;

  const header = buildMissionHeader('Performance Optimizer', projectName, hasContext);

  const philosophy = `## Your Philosophy

You follow the principle of "measure twice, optimize once." Focus on identifying actual bottlenecks rather than theoretical ones, always considering the trade-off between performance gains and code simplicity.

## Your Mission

Generate **development ideas** that improve:
- **Speed**: Faster response times and rendering
- **Efficiency**: Better resource utilization
- **Scalability**: Handling more load gracefully
- **User Experience**: Perceived performance improvements

`;

  const focusAreas = buildFocusAreas();

  const qualityRequirements = buildQualityRequirements([
    '**Evidence-Based**: Point to actual performance issues in the code',
    '**Measurable**: Suggest ways to measure improvement',
    '**Practical**: Optimizations should be implementable',
    '**Balanced**: Consider complexity vs performance gain',
    '**Specific**: Name exact functions, queries, or components',
  ]);

  const contentSections = buildContentSections(
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection
  );

  const analysisProcess = buildAnalysisProcess([
    '**Identify Hotspots**: Look for frequently executed code',
    '**Analyze Algorithms**: Check time complexity',
    '**Check Caching**: Find repeated expensive operations',
    '**Review Async**: Look for sequential operations that could be parallel',
    '**Assess Memory**: Identify potential leaks and large allocations',
    '**Database Queries**: Check for N+1 problems and missing indexes',
  ]);

  const criticalInstructions = buildCriticalInstructions(
    [
      'Focus on actual bottlenecks (hot paths)',
      'Consider algorithmic improvements first',
      'Suggest caching for expensive operations',
      'Look for unnecessary re-renders',
      'Identify N+1 query patterns',
      'Check for memory leaks',
      'Consider lazy loading and code splitting',
    ],
    [
      'Micro-optimize rarely executed code',
      'Suggest premature optimization',
      'Recommend complex optimizations for minimal gains',
      'Sacrifice code readability without significant benefit',
      'Ignore the 80/20 rule (optimize the 20% that matters)',
      'Suggest optimizations that make code unmaintainable',
    ]
  );

  const expectedOutput = buildExpectedOutput(
    'Generate 3-5 HIGH-IMPACT performance ideas that:',
    [
      'Target MAJOR bottlenecks (focus on 80/20 rule - biggest wins)',
      'Provide significant, measurable improvements (2x+ gains)',
      'Are specific to the codebase with clear user-facing benefits',
      'Balance performance with maintainability',
      'Include estimation of expected gains (be ambitious)',
    ]
  );

  const contextFocus = buildContextFocus(hasContext, [
    'What operations are most frequent?',
    'Where are the rendering bottlenecks?',
    'What data operations are expensive?',
    'Are there caching opportunities?',
  ]);

  return `${header}

${philosophy}

${focusAreas}

${JSON_SCHEMA_INSTRUCTIONS}

${getCategoryGuidance(['performance', 'ui'])}

${qualityRequirements}

${contentSections}

${analysisProcess}

${criticalInstructions}

${expectedOutput}

${contextFocus ? `\n${contextFocus}\n` : ''}

${JSON_OUTPUT_REMINDER}`;

}
