/**
 * Goal Generator Service
 * LLM-powered repository scanning to generate goal suggestions
 */

import { llmManager } from './llm/llm-manager';
import { SupportedProvider } from './llm/types';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
// Tech debt repository removed - feature deprecated
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { stripCodeFences } from '@/lib/stringUtils';

export interface GoalCandidate {
  title: string;
  description: string;
  reasoning: string;
  priorityScore: number; // 0-100
  suggestedContext?: string; // Context ID
  suggestedStatus: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  source: string;
  sourceMetadata?: any;
}

export interface GoalGenerationOptions {
  projectId: string;
  projectPath: string;
  provider?: SupportedProvider;
  model?: string;
  scanDepth?: 'quick' | 'standard' | 'thorough'; // How deep to scan the repo
  includeSources?: ('repository' | 'git_history' | 'tech_debt' | 'ideas' | 'todos')[];
  maxCandidates?: number;
}

export interface GoalGenerationResult {
  success: boolean;
  candidates: GoalCandidate[];
  candidateIds: string[];
  totalGenerated: number;
  error?: string;
  metadata?: {
    scannedFiles?: number;
    scannedCommits?: number;
    tokensUsed?: number;
  };
}

/**
 * Main goal generation orchestrator
 */
export async function generateGoalCandidates(options: GoalGenerationOptions): Promise<GoalGenerationResult> {
  try {
    const {
      projectId,
      projectPath,
      provider = 'ollama',
      model,
      scanDepth = 'standard',
      includeSources = ['repository', 'tech_debt', 'ideas'],
      maxCandidates = 10
    } = options;

    // Collect data from various sources
    const repoData = includeSources.includes('repository') ? await scanRepository(projectPath, scanDepth) : '';
    const techDebtData = includeSources.includes('tech_debt') ? await scanTechDebt(projectId) : '';
    const ideasData = includeSources.includes('ideas') ? await scanIdeas(projectId) : '';
    const todosData = includeSources.includes('todos') ? await scanTodos(projectPath) : '';
    const gitHistoryData = includeSources.includes('git_history') ? await scanGitHistory(projectPath) : '';

    // Skip LLM call if no meaningful data was collected
    if (!repoData && !techDebtData && !ideasData && !todosData && !gitHistoryData) {
      return {
        success: false,
        candidates: [],
        candidateIds: [],
        totalGenerated: 0,
        error: 'No project data available for goal generation'
      };
    }

    // Get context information
    const contexts = contextRepository.getContextsByProject(projectId);
    const contextSummary = contexts.map(ctx => ({
      id: ctx.id,
      name: ctx.name,
      description: ctx.description,
      files: JSON.parse(ctx.file_paths)
    }));

    // Build the LLM prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      repoData,
      techDebtData,
      ideasData,
      todosData,
      gitHistoryData,
      contexts: contextSummary,
      maxCandidates
    });

    // Call LLM to generate candidates
    const response = await llmManager.generate({
      prompt: userPrompt,
      systemPrompt,
      provider,
      model,
      maxTokens: 4000,
      temperature: 0.7,
      projectId,
      taskType: 'goal_generation',
      taskDescription: 'Generate goal candidates from repository analysis'
    });

    if (!response.success || !response.response) {
      return {
        success: false,
        candidates: [],
        candidateIds: [],
        totalGenerated: 0,
        error: response.error || 'Failed to generate goals'
      };
    }

    // Parse the LLM response
    const candidates = parseLLMResponse(response.response);

    if (candidates.length === 0) {
      return {
        success: false,
        candidates: [],
        candidateIds: [],
        totalGenerated: 0,
        error: 'No candidates generated from LLM response'
      };
    }

    // Save candidates to database
    const candidateIds: string[] = [];
    const dbCandidates = candidates.map(candidate => {
      const id = randomUUID();
      candidateIds.push(id);

      return {
        id,
        project_id: projectId,
        context_id: candidate.suggestedContext,
        title: candidate.title,
        description: candidate.description,
        reasoning: candidate.reasoning,
        priority_score: candidate.priorityScore,
        source: candidate.source,
        source_metadata: candidate.sourceMetadata ? JSON.stringify(candidate.sourceMetadata) : undefined,
        suggested_status: candidate.suggestedStatus
      };
    });

    goalCandidateRepository.createCandidatesBatch(dbCandidates);

    return {
      success: true,
      candidates,
      candidateIds,
      totalGenerated: candidates.length,
      metadata: {
        tokensUsed: ((response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0))
      }
    };
  } catch (error) {
    console.error('Error generating goal candidates:', error);
    return {
      success: false,
      candidates: [],
      candidateIds: [],
      totalGenerated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Scan repository structure and key files
 */
async function scanRepository(projectPath: string, depth: 'quick' | 'standard' | 'thorough'): Promise<string> {
  try {
    const results: string[] = [];

    // Get package.json if exists
    try {
      const packageJson = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(packageJson);
      results.push(`Project: ${pkg.name || 'Unknown'}\nDescription: ${pkg.description || 'No description'}`);
      results.push(`Dependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}`);
    } catch {
      // No package.json
    }

    // Get README if exists
    try {
      const readmePath = ['README.md', 'readme.md', 'README.txt'].find(async (name) => {
        try {
          await fs.access(path.join(projectPath, name));
          return true;
        } catch {
          return false;
        }
      });

      if (readmePath) {
        const readme = await fs.readFile(path.join(projectPath, readmePath), 'utf-8');
        results.push(`README:\n${readme.substring(0, 500)}`);
      }
    } catch {
      // No README
    }

    // Scan file structure (limited based on depth — small samples are sufficient)
    const fileLimit = depth === 'quick' ? 5 : depth === 'standard' ? 10 : 20;
    const files = await scanDirectoryStructure(projectPath, fileLimit);
    results.push(`File Structure:\n${files.join('\n')}`);

    return results.join('\n\n');
  } catch (error) {
    console.error('Error scanning repository:', error);
    return '';
  }
}

/**
 * Recursively scan directory structure
 */
async function scanDirectoryStructure(dirPath: string, limit: number, prefix = '', collected: string[] = []): Promise<string[]> {
  if (collected.length >= limit) return collected;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (collected.length >= limit) break;

      // Skip common directories to ignore
      if (entry.isDirectory() && ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'].includes(entry.name)) {
        continue;
      }

      const relativePath = prefix + entry.name + (entry.isDirectory() ? '/' : '');
      collected.push(relativePath);

      // Recurse into directories
      if (entry.isDirectory()) {
        await scanDirectoryStructure(
          path.join(dirPath, entry.name),
          limit,
          relativePath,
          collected
        );
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return collected;
}

/**
 * Scan tech debt items - deprecated, returns empty string
 */
async function scanTechDebt(_projectId: string): Promise<string> {
  // Tech debt feature deprecated - return empty
  return '';
}

/**
 * Scan existing ideas
 */
async function scanIdeas(projectId: string): Promise<string> {
  try {
    const ideas = ideaRepository.getIdeasByProject(projectId);

    if (ideas.length === 0) {
      return '';
    }

    const pendingIdeas = ideas
      .filter(idea => idea.status === 'pending' || idea.status === 'accepted')
      .slice(0, 10)
      .map(idea => `- [${idea.category}] ${idea.title}: ${idea.description}`)
      .join('\n');

    return `Existing Ideas:\n${pendingIdeas}`;
  } catch (error) {
    console.error('Error scanning ideas:', error);
    return '';
  }
}

/**
 * Scan TODO comments in code
 */
async function scanTodos(projectPath: string): Promise<string> {
  try {
    const todos: string[] = [];
    const todoRegex = /(TODO|FIXME|HACK|XXX|NOTE):\s*(.+)/gi;

    // Scan a small sample of source files for TODOs
    const sourceFiles = await findSourceFiles(projectPath, 10);

    for (const filePath of sourceFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const matches = content.matchAll(todoRegex);

        for (const match of matches) {
          todos.push(`${path.basename(filePath)}: ${match[1]} - ${match[2].trim()}`);
          if (todos.length >= 10) break;
        }
      } catch {
        // Skip files we can't read
      }

      if (todos.length >= 10) break;
    }

    return todos.length > 0 ? `TODO Comments:\n${todos.join('\n')}` : '';
  } catch (error) {
    console.error('Error scanning todos:', error);
    return '';
  }
}

/**
 * Find source files in project
 */
async function findSourceFiles(dirPath: string, limit: number, collected: string[] = []): Promise<string[]> {
  if (collected.length >= limit) return collected;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (collected.length >= limit) break;

      if (entry.isDirectory() && !['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
        await findSourceFiles(path.join(dirPath, entry.name), limit, collected);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(entry.name)) {
        collected.push(path.join(dirPath, entry.name));
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return collected;
}

/**
 * Scan git history (simplified - just get recent commit messages)
 */
async function scanGitHistory(projectPath: string): Promise<string> {
  // This would require git integration - placeholder for now
  return '';
}

/**
 * Build system prompt for LLM - Strategic Advisor Persona
 */
function buildSystemPrompt(): string {
  return `You are a Strategic Product Advisor analyzing a software project.

Your role is to SYNTHESIZE tactical inputs (tech debt, ideas, TODOs) into STRATEGIC GOALS.

## Strategic Thinking Process

1. CLUSTER: Group related items by underlying theme
2. ABSTRACT: Identify the strategic need each cluster represents
3. ENVISION: Describe the ideal end state, not the work to do
4. PRIORITIZE: Rank by business impact and urgency

## Goal Characteristics

Strategic goals should:
- Be OUTCOME-ORIENTED ("Achieve X") not task-oriented ("Do Y")
- Take 2-8 weeks to fully realize
- Encompass multiple tactical items
- Connect to business or user value
- Be inspiring, not prescriptive

## Strategic Themes

Categorize each goal under one of these themes:
- user_experience: Delight users, improve usability
- technical_excellence: Code quality, architecture, maintainability
- velocity: Development speed, deployment frequency
- reliability: Uptime, stability, graceful degradation
- security: Protection, compliance, defense-in-depth
- scalability: Growth capacity, performance at scale
- developer_experience: Team productivity, tooling, documentation
- innovation: New capabilities, experimentation

## Anti-Patterns to AVOID

❌ Listing individual fixes as goals
❌ Using implementation-specific language
❌ Creating goals that take < 1 week (too tactical)
❌ Ignoring the business context

## Transformation Examples

Instead of these tactical items:
- "Add input validation to user form"
- "Fix XSS vulnerability in comments"
- "Sanitize file uploads"

Create THIS strategic goal:
- "Establish bulletproof data integrity and security across all user inputs"

## Output Format

Return a JSON array with this structure:
[
  {
    "title": "Vision-level goal title (60 chars max)",
    "description": "Description of the END STATE - what does success look like? Not what work to do.",
    "reasoning": "Why this goal now? What inputs were synthesized? Business impact?",
    "priorityScore": 85,
    "suggestedContext": "context-id-if-applicable",
    "suggestedStatus": "open",
    "source": "strategic_synthesis",
    "sourceMetadata": {
      "strategicTheme": "user_experience",
      "horizon": "medium_term",
      "synthesizedFrom": ["item1", "item2"]
    }
  }
]

Priority Score Guidelines:
- 90-100: Foundational/Blocking (must achieve before other progress possible)
- 70-89: High Impact (significant business/user value)
- 50-69: Important (improves key metrics)
- 0-49: Nice-to-have (opportunistic improvements)

CRITICAL: Return ONLY valid JSON. Generate 1-5 STRATEGIC goals, not a list of tactical tasks.`;
}

/**
 * Build user prompt with collected data
 */
function buildUserPrompt(data: {
  repoData: string;
  techDebtData: string;
  ideasData: string;
  todosData: string;
  gitHistoryData: string;
  contexts: Array<{ id: string; name: string; description: string | null; files: string[] }>;
  maxCandidates: number;
}): string {
  const parts: string[] = [];

  parts.push(`Synthesize the following project inputs into ${Math.min(data.maxCandidates, 5)} STRATEGIC goals.\n`);

  parts.push(`## Your Task

1. Review ALL inputs below
2. CLUSTER related items by theme (security, performance, UX, etc.)
3. For each cluster, identify the STRATEGIC need it represents
4. Create 1-5 vision-level goals that address these needs
5. Each goal should synthesize multiple tactical items into one strategic direction

Remember: You are creating NORTH STARS, not backlog items.
`);

  if (data.contexts.length > 0) {
    parts.push('## Available Contexts (feature areas)');
    data.contexts.forEach(ctx => {
      parts.push(`- ${ctx.name} (ID: ${ctx.id}): ${ctx.description || 'No description'}`);
    });
    parts.push('');
  }

  if (data.repoData) {
    parts.push('=== REPOSITORY DATA ===');
    parts.push(data.repoData);
    parts.push('');
  }

  if (data.techDebtData) {
    parts.push('=== TECHNICAL DEBT ===');
    parts.push(data.techDebtData);
    parts.push('');
  }

  if (data.ideasData) {
    parts.push('=== EXISTING IDEAS ===');
    parts.push(data.ideasData);
    parts.push('');
  }

  if (data.todosData) {
    parts.push('=== TODO COMMENTS ===');
    parts.push(data.todosData);
    parts.push('');
  }

  if (data.gitHistoryData) {
    parts.push('=== GIT HISTORY ===');
    parts.push(data.gitHistoryData);
    parts.push('');
  }

  parts.push(`## Now Synthesize

Review the inputs above and create STRATEGIC goals. Remember:
- Cluster related items together
- Abstract to the underlying need
- Describe the END STATE, not the work
- Connect to business/user value

Return ONLY the JSON array, no other text.`);

  return parts.join('\n');
}

/**
 * Parse LLM response into goal candidates
 */
function parseLLMResponse(response: string): GoalCandidate[] {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleaned = stripCodeFences(response);

    // Try to find JSON array in the response
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      console.error('LLM response is not an array:', cleaned);
      return [];
    }

    return parsed
      .filter(item => item.title && item.description && typeof item.priorityScore === 'number')
      .map(item => ({
        title: item.title,
        description: item.description,
        reasoning: item.reasoning || '',
        priorityScore: Math.max(0, Math.min(100, item.priorityScore)),
        suggestedContext: item.suggestedContext,
        suggestedStatus: item.suggestedStatus || 'open',
        source: item.source || 'repository_scan',
        sourceMetadata: item.sourceMetadata
      }));
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    console.error('Response was:', response);
    return [];
  }
}
