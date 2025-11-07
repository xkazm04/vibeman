/**
 * Goal Generator Service
 * LLM-powered repository scanning to generate goal suggestions
 */

import { llmManager } from './llm/llm-manager';
import { SupportedProvider } from './llm/types';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { techDebtRepository } from '@/app/db/repositories/tech-debt.repository';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

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
        results.push(`README:\n${readme.substring(0, depth === 'quick' ? 500 : depth === 'standard' ? 1500 : 3000)}`);
      }
    } catch {
      // No README
    }

    // Scan file structure (limited based on depth)
    const fileLimit = depth === 'quick' ? 20 : depth === 'standard' ? 50 : 100;
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
 * Scan tech debt items
 */
async function scanTechDebt(projectId: string): Promise<string> {
  try {
    const techDebtItems = techDebtRepository.getTechDebtByProject(projectId);

    if (techDebtItems.length === 0) {
      return '';
    }

    const summary = techDebtItems
      .filter(item => item.status !== 'resolved' && item.status !== 'dismissed')
      .slice(0, 10)
      .map(item => `- [${item.severity}] ${item.title}: ${item.description}`)
      .join('\n');

    return `Technical Debt Items:\n${summary}`;
  } catch (error) {
    console.error('Error scanning tech debt:', error);
    return '';
  }
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

    // Only scan source files (simplified version)
    const sourceFiles = await findSourceFiles(projectPath, 30);

    for (const filePath of sourceFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const matches = content.matchAll(todoRegex);

        for (const match of matches) {
          todos.push(`${path.basename(filePath)}: ${match[1]} - ${match[2].trim()}`);
          if (todos.length >= 20) break;
        }
      } catch {
        // Skip files we can't read
      }

      if (todos.length >= 20) break;
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
 * Build system prompt for LLM
 */
function buildSystemPrompt(): string {
  return `You are an expert software development assistant specializing in project goal planning and prioritization.

Your task is to analyze a software project and generate actionable goal candidates that would benefit the project.

Guidelines for goal generation:
1. Goals should be SPECIFIC and ACTIONABLE
2. Each goal should have a clear success criterion
3. Prioritize based on impact, urgency, and alignment with project health
4. Consider both technical debt and feature development
5. Match goals to relevant contexts (feature areas) when possible
6. Provide clear reasoning for each goal's priority score

Output your response as a JSON array of goal candidates with this exact structure:
[
  {
    "title": "Clear, concise goal title",
    "description": "Detailed description of what needs to be done and why",
    "reasoning": "Explanation of why this goal is important and how priority was determined",
    "priorityScore": 85,
    "suggestedContext": "context-id-if-applicable",
    "suggestedStatus": "open",
    "source": "repository_scan",
    "sourceMetadata": {}
  }
]

Priority Score Guidelines:
- 90-100: Critical/Urgent (security issues, broken functionality, major bugs)
- 70-89: High Priority (performance issues, important features, significant tech debt)
- 50-69: Medium Priority (nice-to-have features, minor improvements, refactoring)
- 0-49: Low Priority (cosmetic changes, future considerations, optional enhancements)

IMPORTANT: Return ONLY valid JSON, no additional text or explanation.`;
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

  parts.push(`Analyze the following project data and generate up to ${data.maxCandidates} goal candidates.\n`);

  if (data.contexts.length > 0) {
    parts.push('Available Contexts (feature areas):');
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

  parts.push('Generate goal candidates now. Return ONLY the JSON array, no other text.');

  return parts.join('\n');
}

/**
 * Parse LLM response into goal candidates
 */
function parseLLMResponse(response: string): GoalCandidate[] {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleaned = response.trim();

    // Remove markdown code fences
    cleaned = cleaned.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    cleaned = cleaned.replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');

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
