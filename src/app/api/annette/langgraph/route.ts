import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/llm/providers/ollama-client';
import { createAnnetteSystemPrompt } from '@/prompts/annette-system-prompt';
import { getToolDefinitions } from '@/prompts/annette-tool-definitions';
import { formatProjectMetadata } from '@/prompts/annette-project-metadata';
import { createAnnetteAnalysisPrompt } from '@/prompts/annette-analysis-prompt';

interface ToolCall {
  name: string;
  description: string;
  parameters: any;
  result: any;
}

interface LangGraphState {
  message: string;
  projectId: string;
  toolsUsed: ToolCall[];
  response: string;
  step: 'analyze' | 'tool_selection' | 'tool_execution' | 'response_generation' | 'complete' | 'awaiting_confirmation';
  needsConfirmation: boolean;
  confirmationType?: 'yes_no' | 'clarification';
  confirmationQuestion?: string;
  confidence: number;
}

// Available tools definition
const AVAILABLE_TOOLS = [
  {
    name: 'get_project_goals',
    description: 'Fetches all goals for a specific project. Use this when user asks about goals, goal count, or project objectives.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch goals for'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'get_project_backlog',
    description: 'Retrieves all backlog items and tasks for a specific project. Use this when user asks about pending tasks, work items, or project backlog.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch backlog for'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'get_project_contexts',
    description: 'Fetches all contexts and context groups for a project. Use this when user asks about documentation structure, code organization, or available contexts.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch contexts for'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'get_context_groups',
    description: 'Retrieves context groups and their organization for a project. Use this when user asks about context categorization or documentation hierarchy.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to fetch context groups for'
        }
      },
      required: ['projectId']
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const { message, projectId, projectContext, userConfirmation } = await request.json();

    if (!message || !projectId) {
      return NextResponse.json(
        { error: 'Message and projectId are required' },
        { status: 400 }
      );
    }

    // Initialize LangGraph state
    const state: LangGraphState = {
      message,
      projectId,
      toolsUsed: [],
      response: '',
      step: 'analyze',
      needsConfirmation: false,
      confidence: 0
    };

    // Initialize Ollama client
    const ollamaClient = new OllamaClient();

    // Step 1: Analyze the message and determine if tools are needed
    state.step = 'analyze';
    
    // Create comprehensive analysis prompt
    const analysisPrompt = createAnnetteAnalysisPrompt(
      message,
      projectId,
      getToolDefinitions()
    );

    const analysisResponse = await ollamaClient.generate({
      prompt: analysisPrompt,
      model: 'gpt-oss:20b',
      taskType: 'analysis'
    });

    if (!analysisResponse.success) {
      throw new Error(`Analysis failed: ${analysisResponse.error}`);
    }

    // Parse the analysis response
    const analysisResult = ollamaClient.parseJsonResponse(analysisResponse.response);
    if (!analysisResult.success) {
      throw new Error('Failed to parse analysis response');
    }

    const analysis = analysisResult.data;
    
    // Update state with analysis results
    state.confidence = analysis.confidence || 100;
    state.needsConfirmation = analysis.needsConfirmation || false;
    state.confirmationType = analysis.confirmationType;
    state.confirmationQuestion = analysis.confirmationQuestion;

    // Check if we need user confirmation
    if (state.needsConfirmation && !userConfirmation) {
      state.step = 'awaiting_confirmation';
      
      return NextResponse.json({
        success: true,
        needsConfirmation: true,
        confirmationType: state.confirmationType,
        confirmationQuestion: state.confirmationQuestion,
        confidence: state.confidence,
        reasoning: analysis.reasoning,
        userIntent: analysis.userIntent,
        alternatives: analysis.alternatives || [],
        toolsToUse: analysis.toolsToUse || []
      });
    }

    // Step 2: Tool selection and execution
    if (analysis.needsTools && analysis.toolsToUse?.length > 0) {
      state.step = 'tool_selection';
      
      for (const toolToUse of analysis.toolsToUse) {
        state.step = 'tool_execution';
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        if (toolToUse.name === 'get_project_goals') {
          try {
            const goalsUrl = `${baseUrl}/api/goals?projectId=${encodeURIComponent(toolToUse.parameters.projectId)}`;
            const goalsResponse = await fetch(goalsUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!goalsResponse.ok) {
              throw new Error(`Goals API failed: ${goalsResponse.status}`);
            }

            const goalsData = await goalsResponse.json();
            
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Fetched project goals',
              parameters: toolToUse.parameters,
              result: goalsData
            };

            state.toolsUsed.push(toolCall);
          } catch (error) {
            console.error('Tool execution error:', error);
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Failed to fetch project goals',
              parameters: toolToUse.parameters,
              result: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
            state.toolsUsed.push(toolCall);
          }
        } else if (toolToUse.name === 'get_project_backlog') {
          try {
            const backlogUrl = `${baseUrl}/api/backlog?projectId=${encodeURIComponent(toolToUse.parameters.projectId)}`;
            const backlogResponse = await fetch(backlogUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!backlogResponse.ok) {
              throw new Error(`Backlog API failed: ${backlogResponse.status}`);
            }

            const backlogData = await backlogResponse.json();
            
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Fetched project backlog',
              parameters: toolToUse.parameters,
              result: backlogData
            };

            state.toolsUsed.push(toolCall);
          } catch (error) {
            console.error('Tool execution error:', error);
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Failed to fetch project backlog',
              parameters: toolToUse.parameters,
              result: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
            state.toolsUsed.push(toolCall);
          }
        } else if (toolToUse.name === 'get_project_contexts') {
          try {
            const contextsUrl = `${baseUrl}/api/contexts?projectId=${encodeURIComponent(toolToUse.parameters.projectId)}`;
            const contextsResponse = await fetch(contextsUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!contextsResponse.ok) {
              throw new Error(`Contexts API failed: ${contextsResponse.status}`);
            }

            const contextsData = await contextsResponse.json();
            
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Fetched project contexts',
              parameters: toolToUse.parameters,
              result: contextsData
            };

            state.toolsUsed.push(toolCall);
          } catch (error) {
            console.error('Tool execution error:', error);
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Failed to fetch project contexts',
              parameters: toolToUse.parameters,
              result: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
            state.toolsUsed.push(toolCall);
          }
        } else if (toolToUse.name === 'get_context_groups') {
          try {
            const groupsUrl = `${baseUrl}/api/context-groups?projectId=${encodeURIComponent(toolToUse.parameters.projectId)}`;
            const groupsResponse = await fetch(groupsUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!groupsResponse.ok) {
              throw new Error(`Context Groups API failed: ${groupsResponse.status}`);
            }

            const groupsData = await groupsResponse.json();
            
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Fetched context groups',
              parameters: toolToUse.parameters,
              result: groupsData
            };

            state.toolsUsed.push(toolCall);
          } catch (error) {
            console.error('Tool execution error:', error);
            const toolCall: ToolCall = {
              name: toolToUse.name,
              description: 'Failed to fetch context groups',
              parameters: toolToUse.parameters,
              result: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
            state.toolsUsed.push(toolCall);
          }
        }
      }
    }

    // Step 3: Generate final response using the structured prompt system
    state.step = 'response_generation';
    
    // Format project metadata
    const projectMetadata = projectContext ? 
      formatProjectMetadata(projectContext) : 
      'Project information not available';
    
    // Format tool results
    const toolResults = state.toolsUsed.length > 0 ? 
      state.toolsUsed.map(tool => `
### Tool: ${tool.name}
**Description**: ${tool.description}
**Parameters**: ${JSON.stringify(tool.parameters, null, 2)}
**Result**: ${JSON.stringify(tool.result, null, 2)}
`).join('\n') : 'No tools were executed for this query.';

    // Create the comprehensive system prompt
    const systemMessage = createAnnetteSystemPrompt(
      message,
      projectMetadata,
      getToolDefinitions(),
      toolResults
    );

    const responseGeneration = await ollamaClient.generate({
      prompt: systemMessage,
      model: 'gpt-oss:20b',
      taskType: 'response_generation'
    });

    if (!responseGeneration.success) {
      throw new Error(`Response generation failed: ${responseGeneration.error}`);
    }

    state.response = responseGeneration.response;
    state.step = 'complete';

    return NextResponse.json({
      success: true,
      response: state.response,
      toolsUsed: state.toolsUsed,
      analysis: analysis.reasoning,
      userIntent: analysis.userIntent || 'Intent analysis not available',
      confidence: state.confidence,
      needsConfirmation: false,
      steps: [
        'Message analyzed',
        `User intent: ${analysis.userIntent || 'Unknown'}`,
        `Confidence: ${state.confidence}%`,
        `Tools needed: ${analysis.needsTools ? 'Yes' : 'No'}`,
        `Tools executed: ${state.toolsUsed.length}`,
        'Response generated'
      ]
    });

  } catch (error) {
    console.error('LangGraph orchestrator error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolsUsed: [],
        response: 'Sorry, I encountered an error while processing your request.'
      },
      { status: 500 }
    );
  }
}