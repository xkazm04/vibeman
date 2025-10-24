import { goalDb, contextDb, DbGoal, DbContext } from '@/lib/database';
import { AnthropicClient } from '@/lib/llm/providers/anthropic-client';
import { createRequirement } from './claudeCodeManager';
import {
  GoalWithContext,
  GeneratedRequirement,
  buildSystemPrompt,
  buildUserPrompt,
  loadHighLevelDocs,
  buildRequirementContent,
} from './requirementPrompts';
import * as fs from 'fs';
import * as path from 'path';

export async function generateRequirementsFromGoals(
  projectId: string,
  projectPath: string
): Promise<{ success: boolean; requirements?: GeneratedRequirement[]; count?: number; error?: string }> {
  try {
    // 1. Get all open/in_progress goals for the project
    const allGoals = goalDb.getGoalsByProject(projectId);
    const activeGoals = allGoals.filter(
      (g) => g.status === 'open' || g.status === 'in_progress'
    );

    if (activeGoals.length === 0) {
      return {
        success: false,
        error: 'No active goals found for this project',
      };
    }

    // 2. Fetch ALL contexts for the project (not just goal-linked ones)
    const allContexts = contextDb.getContextsByProject(projectId);
    const goalsWithContexts: GoalWithContext[] = [];

    for (const goal of activeGoals) {
      const goalData: GoalWithContext = { goal };

      // If goal has a specific context, use that
      if (goal.context_id) {
        const context = allContexts.find((c) => c.id === goal.context_id);
        if (context) {
          goalData.context = context;
          goalData.contextFiles = await loadContextFiles(context, projectPath);

          // Check if context has FILE_STRUCTURE.MD
          goalData.hasFileStructureMd = hasFileStructureMd(context, projectPath);
        }
      } else {
        // If goal has no specific context, include a summary of ALL contexts
        // This gives the LLM broader understanding of the project
        console.log(`Goal "${goal.title}" has no specific context, loading project-wide context...`);

        // Load files from all contexts (limit to prevent token overflow)
        const filesFromAllContexts: Array<{ path: string; content: string }> = [];

        if (allContexts.length > 0) {
          for (const context of allContexts.slice(0, 3)) {
            // Limit to first 3 contexts
            try {
              const files = await loadContextFiles(context, projectPath, 2); // 2 files per context
              filesFromAllContexts.push(...files);
            } catch (error) {
              console.warn(`Failed to load files from context ${context.name}:`, error);
            }
          }
        } else {
          console.log(`No contexts available for project. Will generate requirements from goal description only.`);
        }

        goalData.contextFiles = filesFromAllContexts;
      }

      goalsWithContexts.push(goalData);
    }

    // 3. Load high-level documentation
    const highLevelDocs = loadHighLevelDocs(projectPath);
    if (highLevelDocs) {
      console.log('Loaded high-level documentation from docs/high.md');
    }

    // 4. Build prompts using separated prompt builder
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(goalsWithContexts, projectPath, highLevelDocs);

    // 5. Call Anthropic LLM
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
      };
    }

    const anthropic = new AnthropicClient({ apiKey });

    console.log('[generateRequirementsFromGoals] Calling Anthropic API...');
    const response = await anthropic.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 8000,
      temperature: 0.7,
      projectId,
    });

    if (!response.success || !response.response) {
      console.error('[generateRequirementsFromGoals] LLM generation failed:', response.error);
      return {
        success: false,
        error: response.error || 'LLM generation failed',
      };
    }

    console.log('[generateRequirementsFromGoals] LLM response received, parsing...');

    // 6. Parse LLM response
    let parsedResponse: { requirements: GeneratedRequirement[] };
    try {
      // Clean response - remove markdown code blocks if present
      let cleanedResponse = response.response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      parsedResponse = JSON.parse(cleanedResponse);
      console.log('[generateRequirementsFromGoals] Successfully parsed response, creating requirements...');
    } catch (parseError) {
      console.error('[generateRequirementsFromGoals] Failed to parse LLM response:', parseError);
      console.error('[generateRequirementsFromGoals] Raw response:', response.response);
      return {
        success: false,
        error: `Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      };
    }

    // 7. Create requirement files
    const createdRequirements: GeneratedRequirement[] = [];

    for (const req of parsedResponse.requirements) {
      const content = buildRequirementContent(req);
      const createResult = createRequirement(projectPath, req.name, content);

      if (createResult.success) {
        createdRequirements.push(req);
      } else {
        console.error(`Failed to create requirement ${req.name}:`, createResult.error);
      }
    }

    console.log(`[generateRequirementsFromGoals] Successfully created ${createdRequirements.length} requirements`);
    return {
      success: true,
      requirements: createdRequirements,
      count: createdRequirements.length,
    };
  } catch (error) {
    console.error('[generateRequirementsFromGoals] Error generating requirements:', error);
    if (error instanceof Error) {
      console.error('[generateRequirementsFromGoals] Error stack:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during requirement generation',
    };
  }
}

/**
 * Load files from a context with better error handling and file system access
 */
async function loadContextFiles(
  context: DbContext,
  projectPath: string,
  maxFiles: number = 10
): Promise<Array<{ path: string; content: string }>> {
  const contextFiles: Array<{ path: string; content: string }> = [];

  try {
    const filePaths = JSON.parse(context.file_paths) as string[];

    for (const filePath of filePaths.slice(0, maxFiles)) {
      try {
        // Try direct file system access first (more reliable than API in server context)
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);

        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Limit content to 1000 characters to manage token usage
          contextFiles.push({
            path: filePath,
            content: content.substring(0, 1000),
          });
        } else {
          console.warn(`File not found: ${fullPath}`);
        }
      } catch (fileError) {
        console.error(`Failed to read file ${filePath}:`, fileError);
      }
    }
  } catch (parseError) {
    console.error('Failed to parse context file paths:', parseError);
  }

  return contextFiles;
}

/**
 * Check if a context contains FILE_STRUCTURE.MD
 */
function hasFileStructureMd(context: DbContext, projectPath: string): boolean {
  try {
    const filePaths = JSON.parse(context.file_paths) as string[];

    // Check if any file in context is named FILE_STRUCTURE.MD or FILE_STRUCTURE.md
    return filePaths.some(filePath => {
      const fileName = path.basename(filePath).toUpperCase();
      return fileName === 'FILE_STRUCTURE.MD';
    });
  } catch (error) {
    return false;
  }
}

/**
 * Generate a requirement for a specific goal (async, fires and forgets)
 * Returns immediately after starting the background process
 */
export async function generateRequirementForGoal(
  projectId: string,
  projectPath: string,
  goalId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Fire and forget - start the process in the background
  setImmediate(async () => {
    try {
      console.log(`[generateRequirementForGoal] Starting requirement generation for goal: ${goalId}`);

      // 1. Get the specific goal
      const goal = goalDb.getGoalById(goalId);
      if (!goal) {
        console.error(`[generateRequirementForGoal] Goal not found: ${goalId}`);
        return;
      }

      if (goal.status === 'done' || goal.status === 'rejected') {
        console.log(`[generateRequirementForGoal] Skipping goal with status: ${goal.status}`);
        return;
      }

      // 2. Get context if the goal has one
      const allContexts = contextDb.getContextsByProject(projectId);
      const goalData: GoalWithContext = { goal };

      if (goal.context_id) {
        const context = allContexts.find((c) => c.id === goal.context_id);
        if (context) {
          goalData.context = context;
          goalData.contextFiles = await loadContextFiles(context, projectPath);
          goalData.hasFileStructureMd = hasFileStructureMd(context, projectPath);
        }
      } else {
        // Load files from all contexts (limited)
        console.log(`[generateRequirementForGoal] Goal has no specific context, loading project-wide context...`);
        const filesFromAllContexts: Array<{ path: string; content: string }> = [];

        if (allContexts.length > 0) {
          for (const context of allContexts.slice(0, 3)) {
            try {
              const files = await loadContextFiles(context, projectPath, 2);
              filesFromAllContexts.push(...files);
            } catch (error) {
              console.warn(`[generateRequirementForGoal] Failed to load files from context ${context.name}:`, error);
            }
          }
        } else {
          console.log(`[generateRequirementForGoal] No contexts available. Will generate from goal description only.`);
        }

        goalData.contextFiles = filesFromAllContexts;
      }

      // 3. Load high-level documentation
      const highLevelDocs = loadHighLevelDocs(projectPath);

      // 4. Build prompts
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt([goalData], projectPath, highLevelDocs);

      // 5. Call Anthropic LLM
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('[generateRequirementForGoal] ANTHROPIC_API_KEY not configured');
        return;
      }

      const anthropic = new AnthropicClient({ apiKey });

      const response = await anthropic.generate({
        prompt: userPrompt,
        systemPrompt,
        maxTokens: 8000,
        temperature: 0.7,
        projectId,
      });

      if (!response.success || !response.response) {
        console.error('[generateRequirementForGoal] LLM generation failed:', response.error);
        return;
      }

      // 6. Parse LLM response
      let parsedResponse: { requirements: GeneratedRequirement[] };
      try {
        let cleanedResponse = response.response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }

        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('[generateRequirementForGoal] Failed to parse LLM response:', response.response);
        return;
      }

      // 7. Create requirement files (should typically be 1 requirement for 1 goal)
      for (const req of parsedResponse.requirements) {
        const content = buildRequirementContent(req);
        const createResult = createRequirement(projectPath, req.name, content);

        if (createResult.success) {
          console.log(`[generateRequirementForGoal] Created requirement: ${req.name}`);
        } else {
          console.error(`[generateRequirementForGoal] Failed to create requirement ${req.name}:`, createResult.error);
        }
      }

      console.log(`[generateRequirementForGoal] Completed for goal: ${goalId}`);
    } catch (error) {
      console.error('[generateRequirementForGoal] Error in background process:', error);
    }
  });

  // Return immediately
  return {
    success: true,
    message: 'Requirement generation started in background',
  };
}
