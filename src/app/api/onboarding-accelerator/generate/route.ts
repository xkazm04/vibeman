/**
 * Onboarding Accelerator API - AI Learning Path Generator
 * Generates personalized learning paths based on assigned work and project context
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  learningPathDb,
  learningModuleDb,
  codeWalkthroughDb,
  quizQuestionDb,
  contextDb,
  goalDb,
  implementationLogDb,
} from '@/app/db';
import type { DbContext } from '@/app/db/models/types';
import type { AssignedWorkItem, DifficultyLevel } from '@/app/db/models/onboarding-accelerator.types';

import { logger } from '@/lib/logger';
interface GenerateRequest {
  pathId: string;
  projectId: string;
  assignedWork: AssignedWorkItem[];
  includeWalkthroughs?: boolean;
  includeQuizzes?: boolean;
}

interface ContextWithRelevance extends DbContext {
  relevanceScore: number;
  relatedWorkItems: string[];
}

/**
 * POST /api/onboarding-accelerator/generate
 * Generate a personalized learning path based on assigned work
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { pathId, projectId, assignedWork, includeWalkthroughs = true, includeQuizzes = true } = body;

    if (!pathId || !projectId) {
      return NextResponse.json(
        { error: 'pathId and projectId are required' },
        { status: 400 }
      );
    }

    // Get the learning path
    const path = learningPathDb.getById(pathId);
    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    // Get all project contexts
    const contexts = contextDb.getContextsByProject(projectId);
    if (contexts.length === 0) {
      return NextResponse.json(
        { error: 'No contexts found for this project. Please create contexts first.' },
        { status: 400 }
      );
    }

    // Get project goals for additional context
    const goals = goalDb.getGoalsByProject(projectId);

    // Get implementation history to understand what's been done
    const implementationLogs = implementationLogDb.getLogsByProject(projectId);

    // Calculate relevance scores for each context based on assigned work
    const contextRelevance = calculateContextRelevance(contexts, assignedWork, goals);

    // Sort by relevance and filter out low-relevance contexts
    const relevantContexts = contextRelevance
      .filter(c => c.relevanceScore > 20)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Determine prerequisite order based on context dependencies
    const orderedContexts = orderContextsByDependency(relevantContexts);

    // Generate learning modules from contexts
    let moduleIndex = 0;
    const createdModules = [];

    // First module: Project Overview (always included)
    const overviewModule = learningModuleDb.create({
      path_id: pathId,
      context_id: null,
      title: 'Project Overview',
      description: 'Introduction to the project architecture, key systems, and development workflow.',
      order_index: moduleIndex++,
      difficulty: 'beginner',
      estimated_minutes: 30,
      relevance_score: 100,
      prerequisites: [],
      key_concepts: [
        { name: 'Architecture', description: 'Overall project structure and patterns', importance: 'critical' },
        { name: 'Development Workflow', description: 'How code is written, reviewed, and deployed', importance: 'important' },
        { name: 'Key Technologies', description: 'Main frameworks and libraries used', importance: 'critical' },
      ],
      code_areas: [],
    });
    createdModules.push(overviewModule);

    // Create modules for each relevant context
    for (const context of orderedContexts.slice(0, 10)) { // Limit to top 10 contexts
      const parsedFilePaths = JSON.parse(context.file_paths) as string[];

      // Determine difficulty based on context characteristics
      const difficulty = determineDifficulty(context, parsedFilePaths);

      // Estimate time based on number of files and complexity
      const estimatedMinutes = estimateModuleTime(context, parsedFilePaths);

      // Generate key concepts from context
      const keyConcepts = generateKeyConcepts(context);

      // Find prerequisites (earlier modules for related contexts)
      const prerequisites = findPrerequisites(context, createdModules, contexts);

      const module = learningModuleDb.create({
        path_id: pathId,
        context_id: context.id,
        title: `Understanding: ${context.name}`,
        description: context.description || `Learn about the ${context.name} area of the codebase.`,
        order_index: moduleIndex++,
        difficulty,
        estimated_minutes: estimatedMinutes,
        relevance_score: context.relevanceScore,
        prerequisites,
        key_concepts: keyConcepts,
        code_areas: parsedFilePaths.slice(0, 10), // Limit to 10 main files
      });

      createdModules.push(module);

      // Generate walkthroughs for key files
      if (includeWalkthroughs && parsedFilePaths.length > 0) {
        await generateWalkthroughs(module.id, parsedFilePaths.slice(0, 3), context);
      }

      // Generate quiz questions
      if (includeQuizzes) {
        await generateQuizQuestions(module.id, context, keyConcepts);
      }
    }

    // Add modules for assigned work items
    for (const workItem of assignedWork || []) {
      // Find related context
      const relatedContext = findRelatedContext(workItem, contexts);

      const module = learningModuleDb.create({
        path_id: pathId,
        context_id: relatedContext?.id || null,
        title: `Assigned Task: ${workItem.title}`,
        description: workItem.description || `Preparation for working on: ${workItem.title}`,
        order_index: moduleIndex++,
        difficulty: 'intermediate',
        estimated_minutes: 45,
        relevance_score: 95,
        prerequisites: createdModules.slice(-1).map(m => m.id), // Previous module as prerequisite
        key_concepts: [
          { name: 'Task Requirements', description: 'What needs to be accomplished', importance: 'critical' },
          { name: 'Related Code', description: 'Code areas that will be modified', importance: 'important' },
          { name: 'Testing Strategy', description: 'How to verify the implementation', importance: 'important' },
        ],
        code_areas: relatedContext ? JSON.parse(relatedContext.file_paths).slice(0, 5) : [],
      });

      createdModules.push(module);
    }

    // Calculate totals and update path
    const totalEstimatedMinutes = createdModules.reduce((sum, m) => sum + m.estimated_minutes, 0);
    learningPathDb.update(pathId, {
      assigned_work: assignedWork || [],
      total_modules: createdModules.length,
      estimated_hours: totalEstimatedMinutes / 60,
      status: 'draft',
    });

    // Return the updated path with modules
    const updatedPath = learningPathDb.getById(pathId);
    const modules = learningModuleDb.getByPath(pathId);

    return NextResponse.json({
      path: {
        ...updatedPath,
        assigned_work: JSON.parse(updatedPath?.assigned_work || '[]'),
      },
      modules: modules.map(m => ({
        ...m,
        prerequisites: JSON.parse(m.prerequisites),
        key_concepts: JSON.parse(m.key_concepts),
        code_areas: JSON.parse(m.code_areas),
      })),
      summary: {
        totalModules: createdModules.length,
        estimatedHours: totalEstimatedMinutes / 60,
        contextsIncluded: orderedContexts.length,
        workItemsIncluded: (assignedWork || []).length,
      },
    });
  } catch (error) {
    logger.error('Error generating learning path:', { data: error });
    return NextResponse.json({ error: 'Failed to generate learning path' }, { status: 500 });
  }
}

/**
 * Calculate relevance scores for contexts based on assigned work
 */
function calculateContextRelevance(
  contexts: DbContext[],
  assignedWork: AssignedWorkItem[] | undefined,
  goals: ReturnType<typeof goalDb.getGoalsByProject>
): ContextWithRelevance[] {
  return contexts.map(context => {
    let score = 30; // Base score
    const relatedWorkItems: string[] = [];
    const filePaths = JSON.parse(context.file_paths) as string[];

    // Check for keyword matches with assigned work
    for (const workItem of assignedWork || []) {
      const workKeywords = (workItem.title + ' ' + (workItem.description || '')).toLowerCase();
      const contextKeywords = (context.name + ' ' + (context.description || '')).toLowerCase();

      // Check for word overlap
      const workWords = workKeywords.split(/\s+/);
      const contextWords = contextKeywords.split(/\s+/);
      const overlap = workWords.filter(w => w.length > 3 && contextWords.includes(w)).length;

      if (overlap > 0) {
        score += overlap * 15;
        relatedWorkItems.push(workItem.title);
      }

      // Check if work type matches context area
      if (workItem.type === 'bugfix' && contextKeywords.includes('error')) score += 10;
      if (workItem.type === 'feature' && contextKeywords.includes('component')) score += 10;
      if (workItem.type === 'refactor' && contextKeywords.includes('legacy')) score += 10;
    }

    // Boost for contexts with more files (likely more important)
    if (filePaths.length > 5) score += 10;
    if (filePaths.length > 10) score += 10;

    // Boost for contexts with descriptions (better documented)
    if (context.description && context.description.length > 50) score += 10;

    // Boost for contexts with goals
    const contextGoals = goals.filter(g => g.context_id === context.id);
    score += contextGoals.length * 5;

    // Cap at 100
    return {
      ...context,
      relevanceScore: Math.min(100, score),
      relatedWorkItems,
    };
  });
}

/**
 * Order contexts by dependency (simpler contexts first)
 */
function orderContextsByDependency(contexts: ContextWithRelevance[]): ContextWithRelevance[] {
  // For now, sort by:
  // 1. Relevance score (higher first)
  // 2. Number of files (fewer first for simpler contexts)
  return [...contexts].sort((a, b) => {
    // High relevance first
    if (Math.abs(a.relevanceScore - b.relevanceScore) > 15) {
      return b.relevanceScore - a.relevanceScore;
    }
    // Then simpler (fewer files) first
    const aFiles = JSON.parse(a.file_paths).length;
    const bFiles = JSON.parse(b.file_paths).length;
    return aFiles - bFiles;
  });
}

/**
 * Determine module difficulty based on context
 */
function determineDifficulty(context: DbContext, filePaths: string[]): DifficultyLevel {
  const description = (context.description || '').toLowerCase();

  // Advanced indicators
  if (
    description.includes('complex') ||
    description.includes('architecture') ||
    description.includes('security') ||
    filePaths.length > 15
  ) {
    return 'advanced';
  }

  // Intermediate indicators
  if (
    description.includes('integration') ||
    description.includes('api') ||
    description.includes('database') ||
    filePaths.length > 7
  ) {
    return 'intermediate';
  }

  return 'beginner';
}

/**
 * Estimate module time based on complexity
 */
function estimateModuleTime(context: DbContext, filePaths: string[]): number {
  let minutes = 20; // Base time

  // Add time based on files
  minutes += filePaths.length * 3;

  // Add time for complex descriptions
  const description = context.description || '';
  if (description.length > 200) minutes += 10;
  if (description.length > 500) minutes += 15;

  // Cap between 15 and 90 minutes
  return Math.max(15, Math.min(90, minutes));
}

/**
 * Generate key concepts from context
 */
function generateKeyConcepts(context: DbContext): Array<{ name: string; description: string; importance: 'critical' | 'important' | 'helpful' }> {
  const concepts: Array<{ name: string; description: string; importance: 'critical' | 'important' | 'helpful' }> = [];
  const description = (context.description || '').toLowerCase();

  // Core concept for the context
  concepts.push({
    name: context.name,
    description: context.description || `Understanding the ${context.name} module`,
    importance: 'critical',
  });

  // Detect patterns in description
  if (description.includes('api') || description.includes('route')) {
    concepts.push({
      name: 'API Design',
      description: 'How endpoints are structured and handle requests',
      importance: 'important',
    });
  }

  if (description.includes('component') || description.includes('ui')) {
    concepts.push({
      name: 'Component Structure',
      description: 'How UI components are organized and communicate',
      importance: 'important',
    });
  }

  if (description.includes('database') || description.includes('data')) {
    concepts.push({
      name: 'Data Model',
      description: 'How data is structured and accessed',
      importance: 'important',
    });
  }

  if (description.includes('test')) {
    concepts.push({
      name: 'Testing Patterns',
      description: 'How this area is tested and validated',
      importance: 'helpful',
    });
  }

  return concepts.slice(0, 5); // Limit to 5 concepts
}

/**
 * Find prerequisite modules for a context
 */
function findPrerequisites(
  context: DbContext,
  existingModules: Array<{ id: string; context_id: string | null; title: string }>,
  allContexts: DbContext[]
): string[] {
  const prerequisites: string[] = [];

  // The first module (Project Overview) is always a prerequisite
  if (existingModules.length > 0) {
    prerequisites.push(existingModules[0].id);
  }

  // Find modules that this context might depend on
  // (Simple heuristic: if file paths overlap, earlier module is a prerequisite)
  const contextFilePaths = JSON.parse(context.file_paths) as string[];

  for (const module of existingModules.slice(1)) {
    if (!module.context_id) continue;

    const moduleContext = allContexts.find(c => c.id === module.context_id);
    if (!moduleContext) continue;

    const moduleFilePaths = JSON.parse(moduleContext.file_paths) as string[];

    // Check for path overlap or directory relationship
    const hasOverlap = contextFilePaths.some(fp =>
      moduleFilePaths.some(mfp => {
        const fpDir = fp.split('/').slice(0, -1).join('/');
        const mfpDir = mfp.split('/').slice(0, -1).join('/');
        return fpDir === mfpDir || fp.includes(mfpDir) || mfp.includes(fpDir);
      })
    );

    if (hasOverlap && prerequisites.length < 3) {
      prerequisites.push(module.id);
    }
  }

  return prerequisites;
}

/**
 * Generate walkthroughs for key files
 */
async function generateWalkthroughs(
  moduleId: string,
  filePaths: string[],
  context: DbContext
): Promise<void> {
  let orderIndex = 0;

  for (const filePath of filePaths) {
    const fileName = filePath.split('/').pop() || filePath;

    codeWalkthroughDb.create({
      module_id: moduleId,
      title: `Exploring: ${fileName}`,
      description: `Understanding the structure and purpose of ${fileName}`,
      file_path: filePath,
      start_line: 1,
      end_line: 50, // Default to first 50 lines
      order_index: orderIndex++,
      explanation: `This file is part of the ${context.name} context. Review its structure, imports, and exported functionality to understand how it fits into the broader system.`,
      key_points: [
        { text: 'Understand the main exports and their purposes' },
        { text: 'Review any imports to see dependencies' },
        { text: 'Look for patterns consistent with the codebase' },
      ],
      related_files: filePaths.filter(fp => fp !== filePath).slice(0, 3),
    });
  }
}

/**
 * Generate quiz questions for a module
 */
async function generateQuizQuestions(
  moduleId: string,
  context: DbContext,
  keyConcepts: Array<{ name: string; description: string }>
): Promise<void> {
  let orderIndex = 0;

  // Question 1: Context purpose
  quizQuestionDb.create({
    module_id: moduleId,
    question: `What is the primary purpose of the ${context.name} module?`,
    question_type: 'multiple_choice',
    options: [
      { id: 'a', text: context.description || `Managing ${context.name} functionality` },
      { id: 'b', text: 'Database migrations' },
      { id: 'c', text: 'User authentication' },
      { id: 'd', text: 'Build configuration' },
    ],
    correct_answer: 'a',
    explanation: `The ${context.name} module is responsible for ${context.description || 'its designated functionality'}. Understanding the purpose of each module helps navigate the codebase effectively.`,
    difficulty: 'beginner',
    points: 10,
    order_index: orderIndex++,
  });

  // Question 2: Key concept
  if (keyConcepts.length > 0) {
    const concept = keyConcepts[0];
    quizQuestionDb.create({
      module_id: moduleId,
      question: `True or False: ${concept.description}`,
      question_type: 'true_false',
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
      correct_answer: 'true',
      explanation: `${concept.name} is an important concept in this module. ${concept.description}`,
      difficulty: 'beginner',
      points: 5,
      order_index: orderIndex++,
    });
  }

  // Question 3: File knowledge
  const filePaths = JSON.parse(context.file_paths) as string[];
  if (filePaths.length > 0) {
    const mainFile = filePaths[0].split('/').pop() || filePaths[0];
    quizQuestionDb.create({
      module_id: moduleId,
      question: `Which of the following is a key file in the ${context.name} module?`,
      question_type: 'multiple_choice',
      options: [
        { id: 'a', text: mainFile },
        { id: 'b', text: 'random-unrelated.ts' },
        { id: 'c', text: 'not-in-project.js' },
        { id: 'd', text: 'fake-file.tsx' },
      ],
      correct_answer: 'a',
      explanation: `${mainFile} is a key file in the ${context.name} module. Familiarize yourself with the main files in each module.`,
      difficulty: 'intermediate',
      points: 10,
      order_index: orderIndex++,
    });
  }
}

/**
 * Find context related to a work item
 */
function findRelatedContext(workItem: AssignedWorkItem, contexts: DbContext[]): DbContext | null {
  const workKeywords = (workItem.title + ' ' + (workItem.description || '')).toLowerCase();

  for (const context of contexts) {
    const contextKeywords = (context.name + ' ' + (context.description || '')).toLowerCase();
    const workWords = workKeywords.split(/\s+/).filter(w => w.length > 3);

    for (const word of workWords) {
      if (contextKeywords.includes(word)) {
        return context;
      }
    }
  }

  return contexts[0] || null;
}
