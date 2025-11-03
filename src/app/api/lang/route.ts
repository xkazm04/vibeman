import { NextRequest, NextResponse } from "next/server";
import {
  LangGraphRequest,
  LangGraphResponse,
  LangGraphState,
  AnalysisResult,
  createInitialState,
  validateRequest,
  generateLLMResponse,
  parseJsonResponse,
  executeTools,
  createAnalysisPrompt,
  createResponsePrompt,
  formatToolResults,
  formatProjectMetadata,
  AVAILABLE_TOOLS
} from "@/lib/langgraph";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body: LangGraphRequest = await request.json();
    const validation = validateRequest(body as unknown as Record<string, unknown>);
    
    if (!validation.valid) {
      return NextResponse.json<LangGraphResponse>({
        success: false,
        error: validation.error,
        response: "",
        toolsUsed: [],
        confidence: 0,
        needsConfirmation: false
      }, { status: 400 });
    }

    const { message, projectId, projectContext, provider, model, userConfirmation } = body;
    const state: LangGraphState = createInitialState(message, projectId, provider, model);

    state.step = "analyze";
    const analysisPrompt = createAnalysisPrompt(message, projectId, AVAILABLE_TOOLS);
    const analysisResult = await generateLLMResponse(provider, model, analysisPrompt, "analysis");

    if (!analysisResult.success) {
      throw new Error("Analysis failed: " + analysisResult.error);
    }

    const parsedAnalysis = parseJsonResponse(analysisResult.response || "");
    if (!parsedAnalysis.success || !parsedAnalysis.data) {
      throw new Error("Failed to parse analysis response");
    }

    const analysis: AnalysisResult = parsedAnalysis.data as unknown as AnalysisResult;
    state.confidence = analysis.confidence || 100;
    state.needsConfirmation = analysis.needsConfirmation || false;
    state.confirmationType = analysis.confirmationType;
    state.confirmationQuestion = analysis.confirmationQuestion;

    // Always require confirmation for destructive operations
    if (analysis.isDestructive && !state.needsConfirmation) {
      state.needsConfirmation = true;
      state.confirmationType = 'yes_no';
      state.confirmationQuestion = analysis.confirmationQuestion || 
        'This operation will modify or delete data. Are you sure you want to proceed?';
    }

    if (state.needsConfirmation && !userConfirmation) {
      return NextResponse.json<LangGraphResponse>({
        success: true,
        needsConfirmation: true,
        confirmationType: state.confirmationType,
        confirmationQuestion: state.confirmationQuestion,
        confidence: state.confidence,
        reasoning: analysis.reasoning,
        userIntent: analysis.userIntent,
        alternatives: analysis.alternatives || [],
        toolsToUse: analysis.toolsToUse || [],
        isDestructive: analysis.isDestructive,
        response: "",
        toolsUsed: []
      });
    }

    if (analysis.needsTools && analysis.toolsToUse && analysis.toolsToUse.length > 0) {
      const toolCalls = await executeTools(analysis.toolsToUse);
      state.toolsUsed = toolCalls;
    }

    state.step = "response_generation";
    const projectMeta = projectContext ? formatProjectMetadata(projectContext) : "No context";
    const toolResultsFormatted = formatToolResults(state.toolsUsed);
    const responsePrompt = createResponsePrompt(message, projectMeta, toolResultsFormatted, analysis.userIntent);
    const responseGeneration = await generateLLMResponse(provider, model, responsePrompt, "response_generation");

    if (!responseGeneration.success) {
      throw new Error("Response generation failed");
    }

    state.response = responseGeneration.response || "";

    return NextResponse.json<LangGraphResponse>({
      success: true,
      response: state.response,
      toolsUsed: state.toolsUsed,
      analysis: analysis.reasoning,
      userIntent: analysis.userIntent,
      confidence: state.confidence,
      needsConfirmation: false,
      steps: ["Analyzed", "Tools executed", "Response generated"]
    });
  } catch (error) {
    logger.error('LangGraph error:', { error: error });
    return NextResponse.json<LangGraphResponse>({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      toolsUsed: [],
      response: "Error processing request",
      confidence: 0,
      needsConfirmation: false
    }, { status: 500 });
  }
}
