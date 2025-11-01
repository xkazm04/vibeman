/**
 * Annette Chat API
 * Handles conversation with Annette AI assistant
 */

import { NextRequest, NextResponse } from 'next/server';
import { conversationDb } from '@/app/db';
import { executeTool, ANNETTE_TOOLS } from '../tools';
import { getLLMClient } from '@/lib/langgraph/langHelpers';
import { LLMProvider } from '@/lib/langgraph/langTypes';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface AnnetteRequest {
  projectId: string;
  projectPath: string;
  message: string;
  provider?: LLMProvider;
  model?: string;
  conversationId?: string;
}

interface AnnetteResponse {
  success: boolean;
  response: string;
  toolsUsed?: string[];
  conversationId: string;
  error?: string;
}

/**
 * System prompt for Annette
 */
const ANNETTE_SYSTEM_PROMPT = `You are Annette, a helpful AI assistant for software development projects.

You have access to the following tools:
- get_pending_ideas_count: Get count and details of pending project ideas
- get_high_level_docs: Retrieve project vision and high-level documentation

IMPORTANT RULES:
1. You can ONLY tell users about:
   a) How many pending project ideas they have
   b) Content of the project vision documentation

2. Before summarizing documentation, you MUST ask the user if they want to hear it first
   - Example: "I found the project vision. Would you like me to summarize it for you?"

3. Keep responses concise and friendly

4. Always use the tools to get fresh data - never make up information

5. If asked about something outside your capabilities, politely explain that you can only help with:
   - Counting pending ideas
   - Reading and summarizing project vision

Remember: Your role is to be helpful but limited to these specific capabilities.`;

/**
 * Create a chat completion prompt from conversation history
 */
function createChatPrompt(conversationHistory: any[], newMessage: string): string {
  let prompt = '';

  // Add conversation history
  if (conversationHistory.length > 0) {
    prompt += 'Previous Conversation:\n';
    for (const msg of conversationHistory) {
      const role = msg.role === 'user' ? 'User' : 'Annette';
      prompt += `${role}: ${msg.content}\n`;
    }
    prompt += '\n';
  }

  // Add current message
  prompt += `User: ${newMessage}\n`;
  prompt += 'Annette:';

  return prompt;
}

/**
 * Analyze user message to determine which tools to use
 */
function analyzeMessage(message: string): { tools: string[]; intent: string } {
  const lowerMessage = message.toLowerCase();

  const tools: string[] = [];
  let intent = 'general';

  // Check for ideas-related queries
  if (
    lowerMessage.includes('idea') ||
    lowerMessage.includes('pending') ||
    lowerMessage.includes('how many')
  ) {
    tools.push('get_pending_ideas_count');
    intent = 'ideas_count';
  }

  // Check for documentation-related queries
  if (
    lowerMessage.includes('vision') ||
    lowerMessage.includes('documentation') ||
    lowerMessage.includes('docs') ||
    lowerMessage.includes('readme') ||
    lowerMessage.includes('summarize') ||
    lowerMessage.includes('project')
  ) {
    tools.push('get_high_level_docs');
    intent = 'documentation';
  }

  return { tools, intent };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnnetteRequest = await request.json();
    const { projectId, projectPath, message, provider = 'gemini', model, conversationId } = body;

    // Validation
    if (!projectId || !message) {
      return NextResponse.json<AnnetteResponse>(
        {
          success: false,
          response: '',
          conversationId: '',
          error: 'Missing required fields: projectId, message',
        },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = conversationDb.getConversationById(conversationId);
      if (!conversation) {
        return NextResponse.json<AnnetteResponse>(
          {
            success: false,
            response: '',
            conversationId: '',
            error: 'Conversation not found',
          },
          { status: 404 }
        );
      }
    } else {
      conversation = conversationDb.createConversation({
        projectId,
        title: 'Annette Chat',
      });
    }

    // Get conversation history
    const conversationHistory = conversationDb.getMessages(conversation.id);

    // Add user message to conversation
    conversationDb.addMessage({
      conversationId: conversation.id,
      role: 'user',
      content: message,
      memoryType: 'user_query',
    });

    // Analyze message to determine tools needed
    const analysis = analyzeMessage(message);
    const toolResults: Record<string, any> = {};
    const toolsUsed: string[] = [];

    // Execute tools
    for (const toolName of analysis.tools) {
      let params: any = { projectId };

      if (toolName === 'get_high_level_docs') {
        params = { projectPath };
      }

      const result = await executeTool(toolName, params);

      if (result.success) {
        toolResults[toolName] = result.data;
        toolsUsed.push(toolName);
      }
    }

    // Create enhanced prompt with tool results
    let enhancedMessage = message;

    if (toolsUsed.length > 0) {
      enhancedMessage += '\n\nTool Results:\n';

      if (toolResults.get_pending_ideas_count) {
        enhancedMessage += `\nPending Ideas: ${toolResults.get_pending_ideas_count.total}\n`;
        enhancedMessage += `Ideas: ${JSON.stringify(toolResults.get_pending_ideas_count.ideas, null, 2)}\n`;
      }

      if (toolResults.get_high_level_docs) {
        enhancedMessage += `\nProject Vision:\n${toolResults.get_high_level_docs.content}\n`;
        enhancedMessage += `Source: ${toolResults.get_high_level_docs.source}\n`;
      }
    }

    // Generate response using LLM
    const llmClient = getLLMClient(provider);
    const chatPrompt = createChatPrompt(conversationHistory, enhancedMessage);

    const llmResponse = await llmClient.generate({
      prompt: chatPrompt,
      model: model || (provider === 'gemini' ? 'gemini-2.0-flash-exp' : undefined),
      systemPrompt: ANNETTE_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 500,
    });

    const assistantResponse = llmResponse.response || 'I apologize, but I could not generate a response.';

    // Add assistant message to conversation
    conversationDb.addMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantResponse,
      memoryType: analysis.intent,
      metadata: {
        toolsUsed,
        toolResults: Object.keys(toolResults),
      },
    });

    return NextResponse.json<AnnetteResponse>({
      success: true,
      response: assistantResponse,
      toolsUsed,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('[Annette] Error:', error);

    return NextResponse.json<AnnetteResponse>(
      {
        success: false,
        response: '',
        conversationId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
