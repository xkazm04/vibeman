/**
 * Annette Chat API
 * Handles voice assistant conversations with contextual knowledge retrieval
 * Integrates with LangGraph for intelligent project data access
 */

import { NextRequest, NextResponse } from "next/server";
import { conversationDb } from "@/app/db";

// Logger utility
const logger = {
  error: (message: string, error?: unknown) => {
    const errorMsg = error instanceof Error ? error.message : error;
    // eslint-disable-next-line no-console
    console.error(`[API/AnnetteChat] ${message}`, errorMsg || '');
  }
};

interface AnnetteRequest {
  projectId: string;
  projectPath: string;
  message: string;
  conversationId?: string;
  provider?: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  model?: string;
}

interface SourceItem {
  type: 'context' | 'goal' | 'backlog' | 'documentation' | 'idea';
  id: string;
  name: string;
  description?: string;
}

interface ToolItem {
  name: string;
  description?: string;
}

interface AnnetteResponse {
  success: boolean;
  response: string;
  conversationId: string;
  error?: string;
  sources?: SourceItem[];
  toolsUsed?: ToolItem[];
  insights?: string[];
  nextSteps?: string[];
  recommendedScans?: string[]; // Scan IDs that Annette recommends (e.g., 'contexts', 'vision')
}

interface LangGraphTool {
  tool?: string;
  name?: string;
  result?: Record<string, unknown>;
}

interface LangGraphResult {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
}

interface GoalResult extends LangGraphResult {
  // Goal-specific fields
}

interface BacklogResult extends LangGraphResult {
  // Backlog-specific fields
}

interface IdeaResult extends LangGraphResult {
  // Idea-specific fields
}

interface ContextResult extends LangGraphResult {
  // Context-specific fields
}

interface DocumentationResult {
  id?: string;
  title?: string;
  summary?: string;
}

/**
 * POST /api/annette/chat
 * Process a voice message with contextual knowledge retrieval
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnnetteRequest = await request.json();
    const { projectId, projectPath, message, conversationId, provider = 'gemini', model } = body;

    // Validate required fields
    if (!projectId || !message) {
      return NextResponse.json<AnnetteResponse>({
        success: false,
        response: '',
        conversationId: conversationId || '',
        error: 'Missing required fields: projectId and message are required'
      }, { status: 400 });
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const newConversation = conversationDb.createConversation({
        projectId: projectId,
        title: `Voice conversation - ${new Date().toLocaleString()}`
      });
      currentConversationId = newConversation.id;
    }

    // Store user message
    conversationDb.addMessage({
      conversationId: currentConversationId,
      role: 'user',
      content: message
    });

    // Call LangGraph API for knowledge-based response
    const langGraphResponse = await fetch(`${request.nextUrl.origin}/api/lang`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        projectId,
        projectContext: { path: projectPath },
        provider,
        model: model || getDefaultModel(provider)
      })
    });

    if (!langGraphResponse.ok) {
      throw new Error('Failed to get LangGraph response');
    }

    const langGraphData = await langGraphResponse.json();

    if (!langGraphData.success) {
      throw new Error(langGraphData.error || 'LangGraph request failed');
    }

    // Extract sources from tools used
    const sources = extractSources(langGraphData.toolsUsed || []);

    // Generate insights, next steps, and scan recommendations from response
    const { insights, nextSteps, recommendedScans } = analyzeResponse(langGraphData.response, langGraphData.toolsUsed || []);

    // eslint-disable-next-line no-console
    console.log('[AnnetteChat] Recommendations generated:', recommendedScans);

    // Format response for voice (make it more conversational)
    const voiceResponse = formatForVoice(langGraphData.response);

    // Store assistant message with metadata
    conversationDb.addMessage({
      conversationId: currentConversationId,
      role: 'assistant',
      content: voiceResponse,
      metadata: {
        toolsUsed: langGraphData.toolsUsed,
        sources,
        insights,
        nextSteps,
        recommendedScans
      }
    });

    return NextResponse.json<AnnetteResponse>({
      success: true,
      response: voiceResponse,
      conversationId: currentConversationId,
      sources,
      toolsUsed: langGraphData.toolsUsed?.map((tool: LangGraphTool): ToolItem => ({
        name: tool.tool || tool.name || 'Unknown Tool',
        description: tool.result?.description as string | undefined
      })),
      insights,
      nextSteps,
      recommendedScans
    });

  } catch (error) {

    return NextResponse.json<AnnetteResponse>({
      success: false,
      response: 'I encountered an error processing your request. Please try again.',
      conversationId: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    ollama: 'ministral-3:14b',
    openai: 'gpt-5-mini-2025-08-07',
    anthropic: 'claude-3-5-haiku-latest',
    gemini: 'gemini-flash-latest'
  };
  return defaults[provider] || defaults.gemini;
}

/**
 * Truncate description to max length
 */
function truncateDescription(description: string | undefined, maxLength = 100): string | undefined {
  return description?.substring(0, maxLength);
}

/**
 * Extract contexts from tool results
 */
function extractContextSources(toolName: string, result: Record<string, unknown>): SourceItem[] {
  const sources: SourceItem[] = [];

  if (toolName === 'get_project_contexts' && Array.isArray(result.contexts)) {
    result.contexts.forEach((ctx: ContextResult) => {
      if (ctx.id && (ctx.name || ctx.title)) {
        sources.push({
          type: 'context',
          id: ctx.id,
          name: ctx.name || ctx.title || 'Unnamed Context',
          description: truncateDescription(ctx.description)
        });
      }
    });
  }

  if (toolName === 'get_context_detail' && result.context && typeof result.context === 'object') {
    const ctx = result.context as ContextResult;
    if (ctx.id && (ctx.name || ctx.title)) {
      sources.push({
        type: 'context',
        id: ctx.id,
        name: ctx.name || ctx.title || 'Unnamed Context',
        description: truncateDescription(ctx.description)
      });
    }
  }

  return sources;
}

/**
 * Extract goals from tool results
 */
function extractGoalSources(toolName: string, result: Record<string, unknown>): SourceItem[] {
  const sources: SourceItem[] = [];

  if (toolName.includes('goal') && Array.isArray(result.goals)) {
    result.goals.slice(0, 3).forEach((goal: GoalResult) => {
      if (goal.id && (goal.title || goal.name)) {
        sources.push({
          type: 'goal',
          id: goal.id,
          name: goal.title || goal.name || 'Unnamed Goal',
          description: truncateDescription(goal.description)
        });
      }
    });
  }

  return sources;
}

/**
 * Extract backlog items from tool results
 */
function extractBacklogSources(toolName: string, result: Record<string, unknown>): SourceItem[] {
  const sources: SourceItem[] = [];

  if (toolName === 'get_project_backlog' && Array.isArray(result.items)) {
    result.items.slice(0, 3).forEach((item: BacklogResult) => {
      if (item.id && (item.title || item.name)) {
        sources.push({
          type: 'backlog',
          id: item.id,
          name: item.title || item.name || 'Unnamed Item',
          description: truncateDescription(item.description)
        });
      }
    });
  }

  return sources;
}

/**
 * Extract ideas from tool results
 */
function extractIdeaSources(toolName: string, result: Record<string, unknown>): SourceItem[] {
  const sources: SourceItem[] = [];

  if (toolName === 'get_project_ideas' && Array.isArray(result.ideas)) {
    result.ideas.slice(0, 3).forEach((idea: IdeaResult) => {
      if (idea.id && (idea.title || idea.name)) {
        sources.push({
          type: 'idea',
          id: idea.id,
          name: idea.title || idea.name || 'Unnamed Idea',
          description: truncateDescription(idea.description)
        });
      }
    });
  }

  return sources;
}

/**
 * Extract documentation from tool results
 */
function extractDocumentationSources(toolName: string, result: Record<string, unknown>): SourceItem[] {
  const sources: SourceItem[] = [];

  if (toolName.includes('documentation') && result.documentation && typeof result.documentation === 'object') {
    const doc = result.documentation as DocumentationResult;
    sources.push({
      type: 'documentation',
      id: doc.id || `doc-${Date.now()}`,
      name: doc.title || 'Project Documentation',
      description: truncateDescription(doc.summary)
    });
  }

  return sources;
}

/**
 * Extract source references from tools used
 */
function extractSources(toolsUsed: LangGraphTool[]): SourceItem[] {
  const sources: SourceItem[] = [];

  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name || '';
    const result = tool.result;

    if (!result) continue;

    // Extract different types of sources
    sources.push(...extractContextSources(toolName, result));
    sources.push(...extractGoalSources(toolName, result));
    sources.push(...extractBacklogSources(toolName, result));
    sources.push(...extractIdeaSources(toolName, result));
    sources.push(...extractDocumentationSources(toolName, result));
  }

  return sources;
}

/**
 * Analyze goal insights
 */
function analyzeGoalInsights(goals: GoalResult[]): { insights: string[], nextSteps: string[] } {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  const goalCount = goals.length;
  const openGoals = goals.filter(g => g.status === 'open').length;
  const inProgressGoals = goals.filter(g => g.status === 'in_progress').length;

  if (goalCount > 0) {
    insights.push(`${goalCount} total goals: ${openGoals} open, ${inProgressGoals} in progress`);
  }

  if (openGoals > 0) {
    nextSteps.push('Review and prioritize open goals');
  }

  return { insights, nextSteps };
}

/**
 * Analyze backlog insights
 */
function analyzeBacklogInsights(items: BacklogResult[]): { insights: string[], nextSteps: string[] } {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  const itemCount = items.length;
  const pendingItems = items.filter(i => i.status === 'pending').length;

  if (itemCount > 0) {
    insights.push(`${itemCount} backlog items, ${pendingItems} pending`);
  }

  if (pendingItems > 3) {
    nextSteps.push('Consider processing backlog items');
  }

  return { insights, nextSteps };
}

/**
 * Analyze idea insights
 */
function analyzeIdeaInsights(ideas: IdeaResult[]): { insights: string[], nextSteps: string[] } {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  const ideaCount = ideas.length;
  const pendingIdeas = ideas.filter(i => i.status === 'pending').length;
  const acceptedIdeas = ideas.filter(i => i.status === 'accepted').length;

  if (ideaCount > 0) {
    insights.push(`${ideaCount} total ideas: ${pendingIdeas} pending, ${acceptedIdeas} accepted`);
  }

  if (pendingIdeas > 0) {
    nextSteps.push('Review and evaluate pending ideas');
  }

  return { insights, nextSteps };
}

/**
 * Detect which scans should be recommended based on analysis
 */
function detectRecommendedScans(response: string, toolsUsed: LangGraphTool[]): string[] {
  const recommended: Set<string> = new Set();

  // eslint-disable-next-line no-console
  console.log('[detectRecommendedScans] Analyzing response:', response.substring(0, 100) + '...');
  // eslint-disable-next-line no-console
  console.log('[detectRecommendedScans] Tools used:', toolsUsed.map(t => t.tool || t.name));

  // Analyze response text for scan keywords
  const lowerResponse = response.toLowerCase();

  // Recommend context scan if contexts are mentioned or missing
  if (lowerResponse.includes('context') || lowerResponse.includes('documentation') || lowerResponse.includes('organize')) {
    recommended.add('contexts');
  }

  // Recommend vision scan if goals/strategy mentioned
  if (lowerResponse.includes('goal') || lowerResponse.includes('vision') || lowerResponse.includes('strategic') || lowerResponse.includes('direction')) {
    recommended.add('vision');
  }

  // Recommend structure scan if architecture mentioned
  if (lowerResponse.includes('structure') || lowerResponse.includes('architecture') || lowerResponse.includes('organization')) {
    recommended.add('structure');
  }

  // Recommend build scan if errors/build mentioned
  if (lowerResponse.includes('build') || lowerResponse.includes('error') || lowerResponse.includes('compile')) {
    recommended.add('build');
  }

  // Analyze tools used
  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name || '';
    const result = tool.result;

    if (!result) continue;

    // If contexts are empty or very few, recommend context scan
    if (toolName === 'get_project_contexts' && Array.isArray(result.contexts)) {
      const contextCount = result.contexts.length;
      if (contextCount < 3) {
        recommended.add('contexts');
      }
    }

    // If goals are mentioned, recommend vision scan
    if (toolName.includes('goal') && Array.isArray(result.goals)) {
      const openGoals = result.goals.filter((g: GoalResult) => g.status === 'open').length;
      if (openGoals > 0) {
        recommended.add('vision');
      }
    }

    // If ideas are mentioned, recommend ideas/structure scan
    if (toolName === 'get_project_ideas' && Array.isArray(result.ideas)) {
      const pendingIdeas = result.ideas.filter((i: IdeaResult) => i.status === 'pending').length;
      if (pendingIdeas > 0) {
        recommended.add('structure');
      }
    }
  }

  const result = Array.from(recommended);
  // eslint-disable-next-line no-console
  console.log('[detectRecommendedScans] Recommended scans:', result);
  return result;
}

/**
 * Analyze response to extract insights and next steps
 */
function analyzeResponse(response: string, toolsUsed: LangGraphTool[]): { insights: string[], nextSteps: string[], recommendedScans: string[] } {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  // Extract insights based on tools used
  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name || '';
    const result = tool.result;

    if (!result) continue;

    // Goal insights
    if (toolName.includes('goal') && Array.isArray(result.goals)) {
      const analysis = analyzeGoalInsights(result.goals as GoalResult[]);
      insights.push(...analysis.insights);
      nextSteps.push(...analysis.nextSteps);
    }

    // Backlog insights
    if (toolName === 'get_project_backlog' && Array.isArray(result.items)) {
      const analysis = analyzeBacklogInsights(result.items as BacklogResult[]);
      insights.push(...analysis.insights);
      nextSteps.push(...analysis.nextSteps);
    }

    // Context insights
    if (toolName === 'get_project_contexts' && Array.isArray(result.contexts)) {
      const contextCount = result.contexts.length;
      if (contextCount > 0) {
        insights.push(`${contextCount} documented contexts available`);
      } else {
        insights.push('No contexts found - consider running a context scan');
        nextSteps.push('Run context scan to document code modules');
      }
    }

    // Ideas insights
    if (toolName === 'get_project_ideas' && Array.isArray(result.ideas)) {
      const analysis = analyzeIdeaInsights(result.ideas as IdeaResult[]);
      insights.push(...analysis.insights);
      nextSteps.push(...analysis.nextSteps);
    }
  }

  // Generic next steps if none identified
  if (nextSteps.length === 0) {
    nextSteps.push('Ask follow-up questions for more details');
  }

  // Detect which scans to recommend
  const recommendedScans = detectRecommendedScans(response, toolsUsed);

  return { insights, nextSteps, recommendedScans };
}

/**
 * Format response to be more conversational for voice
 */
function formatForVoice(response: string): string {
  // Remove markdown formatting and list markers
  let voiceResponse = response
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/`/g, '') // Remove code markers
    .replace(/^[\s]*[-•*]\s+/gm, '') // Remove bullet points at start of lines
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n\n+/g, '. ') // Replace double line breaks with periods
    .replace(/\n/g, ' '); // Replace single line breaks with spaces (not commas)

  // Clean up technical phrases and make conversational
  voiceResponse = voiceResponse
    .replace(/^(Here is|Here are|The following)/, 'I found')
    .replace(/based on the data/gi, '')
    .replace(/according to the knowledge base/gi, '')
    .replace(/e\.g\./gi, 'for example')
    .replace(/i\.e\./gi, 'that is')
    .replace(/\(voteCount\s*=\s*\d+\)/gi, '') // Remove technical annotations like (voteCount = 1)
    .replace(/\s+,\s+/g, ', ') // Fix spacing around commas
    .replace(/,\s*,+/g, ',') // Remove duplicate commas
    .replace(/\.\s*\./g, '.') // Remove duplicate periods
    .replace(/\s{2,}/g, ' '); // Remove extra spaces

  // Limit length for voice (max ~75 words = ~30 seconds)
  const words = voiceResponse.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 75) {
    voiceResponse = words.slice(0, 75).join(' ') + '. Would you like more details?';
  }

  return voiceResponse.trim();
}
