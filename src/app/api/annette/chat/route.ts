/**
 * Annette Chat API
 * Handles voice assistant conversations with contextual knowledge retrieval
 * Integrates with LangGraph for intelligent project data access
 */

import { NextRequest, NextResponse } from "next/server";
import { conversationDb } from "@/app/db";
import { v4 as uuidv4 } from "uuid";

interface AnnetteRequest {
  projectId: string;
  projectPath: string;
  message: string;
  conversationId?: string;
  provider?: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  model?: string;
}

interface AnnetteResponse {
  success: boolean;
  response: string;
  conversationId: string;
  error?: string;
  sources?: Array<{
    type: 'context' | 'goal' | 'backlog' | 'documentation' | 'idea';
    id: string;
    name: string;
    description?: string;
  }>;
  toolsUsed?: Array<{
    name: string;
    description?: string;
  }>;
  insights?: string[];
  nextSteps?: string[];
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

    // Generate insights and next steps from response
    const { insights, nextSteps } = analyzeResponse(langGraphData.response, langGraphData.toolsUsed || []);

    // Format response for voice (make it more conversational)
    const voiceResponse = formatForVoice(langGraphData.response);

    // Store assistant message with metadata
    conversationDb.addMessage({
      conversationId: currentConversationId,
      role: 'assistant',
      content: voiceResponse,
      metadata: JSON.stringify({
        toolsUsed: langGraphData.toolsUsed,
        sources,
        insights,
        nextSteps
      })
    });

    return NextResponse.json<AnnetteResponse>({
      success: true,
      response: voiceResponse,
      conversationId: currentConversationId,
      sources,
      toolsUsed: langGraphData.toolsUsed?.map((tool: any) => ({
        name: tool.tool,
        description: tool.description
      })),
      insights,
      nextSteps
    });

  } catch (error) {
    console.error('[Annette Chat API] Error:', error);
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
    ollama: 'gpt-oss:20b',
    openai: 'gpt-5-mini-2025-08-07',
    anthropic: 'claude-3-5-haiku-latest',
    gemini: 'gemini-flash-latest'
  };
  return defaults[provider] || defaults.gemini;
}

/**
 * Extract source references from tools used
 */
function extractSources(toolsUsed: any[]): AnnetteResponse['sources'] {
  const sources: AnnetteResponse['sources'] = [];

  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name;
    const result = tool.result;

    if (!result) continue;

    // Extract contexts
    if (toolName === 'get_project_contexts' && result.contexts) {
      result.contexts.forEach((ctx: any) => {
        sources.push({
          type: 'context',
          id: ctx.id,
          name: ctx.name,
          description: ctx.description?.substring(0, 100)
        });
      });
    }

    // Extract context detail
    if (toolName === 'get_context_detail' && result.context) {
      sources.push({
        type: 'context',
        id: result.context.id,
        name: result.context.name,
        description: result.context.description?.substring(0, 100)
      });
    }

    // Extract goals (from various goal-related tools)
    if (toolName.includes('goal') && result.goals) {
      result.goals.slice(0, 3).forEach((goal: any) => {
        sources.push({
          type: 'goal',
          id: goal.id,
          name: goal.title || goal.name,
          description: goal.description?.substring(0, 100)
        });
      });
    }

    // Extract backlog items
    if (toolName === 'get_project_backlog' && result.items) {
      result.items.slice(0, 3).forEach((item: any) => {
        sources.push({
          type: 'backlog',
          id: item.id,
          name: item.title,
          description: item.description?.substring(0, 100)
        });
      });
    }

    // Extract ideas
    if (toolName.includes('idea') && result.ideas) {
      result.ideas.slice(0, 3).forEach((idea: any) => {
        sources.push({
          type: 'idea',
          id: idea.id,
          name: idea.title || idea.name,
          description: idea.description?.substring(0, 100)
        });
      });
    }

    // Extract documentation
    if (toolName.includes('documentation') && result.documentation) {
      sources.push({
        type: 'documentation',
        id: result.documentation.id || 'doc-' + Date.now(),
        name: result.documentation.title || 'Project Documentation',
        description: result.documentation.summary?.substring(0, 100)
      });
    }
  }

  return sources;
}

/**
 * Analyze response to extract insights and next steps
 */
function analyzeResponse(response: string, toolsUsed: any[]): { insights: string[], nextSteps: string[] } {
  const insights: string[] = [];
  const nextSteps: string[] = [];

  // Extract insights based on tools used
  for (const tool of toolsUsed) {
    const toolName = tool.tool || tool.name;
    const result = tool.result;

    if (!result) continue;

    // Goal insights
    if (toolName.includes('goal')) {
      if (result.goals) {
        const goalCount = result.goals.length;
        const openGoals = result.goals.filter((g: any) => g.status === 'open').length;
        const inProgressGoals = result.goals.filter((g: any) => g.status === 'in_progress').length;

        if (goalCount > 0) {
          insights.push(`${goalCount} total goals: ${openGoals} open, ${inProgressGoals} in progress`);
        }

        if (openGoals > 0) {
          nextSteps.push('Review and prioritize open goals');
        }
      }
    }

    // Backlog insights
    if (toolName === 'get_project_backlog' && result.items) {
      const itemCount = result.items.length;
      const pendingItems = result.items.filter((i: any) => i.status === 'pending').length;

      if (itemCount > 0) {
        insights.push(`${itemCount} backlog items, ${pendingItems} pending`);
      }

      if (pendingItems > 3) {
        nextSteps.push('Consider processing backlog items');
      }
    }

    // Context insights
    if (toolName === 'get_project_contexts' && result.contexts) {
      const contextCount = result.contexts.length;
      if (contextCount > 0) {
        insights.push(`${contextCount} documented contexts available`);
      }
    }

    // Ideas insights
    if (toolName.includes('idea') && result.ideas) {
      const ideaCount = result.ideas.length;
      const pendingIdeas = result.ideas.filter((i: any) => i.status === 'pending').length;

      if (pendingIdeas > 0) {
        insights.push(`${pendingIdeas} pending ideas to review`);
        nextSteps.push('Review and evaluate pending ideas');
      }
    }
  }

  // Generic next steps if none identified
  if (nextSteps.length === 0) {
    nextSteps.push('Ask follow-up questions for more details');
  }

  return { insights, nextSteps };
}

/**
 * Format response to be more conversational for voice
 */
function formatForVoice(response: string): string {
  // Remove markdown formatting
  let voiceResponse = response
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italics
    .replace(/`/g, '') // Remove code markers
    .replace(/\n\n+/g, '. ') // Replace double line breaks with periods
    .replace(/\n/g, ', '); // Replace single line breaks with commas

  // Make it more conversational
  voiceResponse = voiceResponse
    .replace(/^(Here is|Here are|The following)/, 'I found')
    .replace(/based on the data/gi, '')
    .replace(/according to the knowledge base/gi, '');

  // Limit length for voice (max ~200 words)
  const words = voiceResponse.split(/\s+/);
  if (words.length > 200) {
    voiceResponse = words.slice(0, 200).join(' ') + '... Would you like more details?';
  }

  return voiceResponse.trim();
}
