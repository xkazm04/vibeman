/**
 * Monitor Evaluate API
 * LLM-powered message evaluation endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorDb } from '@/lib/monitor_database';
import { AnthropicClient } from '@/lib/llm/providers/anthropic-client';
import { handleApiError } from '@/lib/api-errors';
import { replacePlaceholders } from '@/lib/prompts/builder';
import fs from 'fs';
import path from 'path';

// Load evaluation prompt template
const PROMPT_PATH = path.join(process.cwd(), 'data', 'prompts', 'message-evaluation.txt');
let evaluationPromptTemplate = '';

try {
  evaluationPromptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
} catch (error) {
  // Failed to load evaluation prompt
}

interface EvaluationResult {
  evalOk: boolean;
  reviewOk: boolean;
  evalClass: string;
  classDescription?: string;
  confidence: number;
  reasoning: string;
}

interface Message {
  messageId: string;
  role: string;
  content: string;
  evalOk?: boolean;
}

interface EvaluatedMessage {
  messageId: string;
  skipped?: boolean;
  reason?: string;
  evalClass?: string;
  confidence?: number;
  reasoning?: string;
  newClass?: boolean;
  error?: string;
}

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function generateClassId(): string {
  return `class_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function getExistingClassesText(): Promise<string> {
  const existingClasses = monitorDb.messageClasses.getAll();
  return existingClasses.length > 0
    ? existingClasses.map(c => `- ${c.className}: ${c.description || 'No description'}`).join('\n')
    : 'No existing classes yet';
}

function buildEvaluationPrompt(message: Message, existingClassesText: string): string {
  return replacePlaceholders(evaluationPromptTemplate, {
    existingClasses: existingClassesText,
    role: message.role,
    content: message.content,
  });
}

async function callLLMForEvaluation(prompt: string): Promise<EvaluationResult> {
  const anthropic = new AnthropicClient({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await anthropic.generate({
    prompt,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
    temperature: 0.3
  });

  if (!response.success || !response.response) {
    throw new Error('LLM evaluation failed');
  }

  const jsonMatch = response.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function handleMessageClass(evaluation: EvaluationResult, newClasses: Set<string>): Promise<void> {
  const existingClass = monitorDb.messageClasses.getByName(evaluation.evalClass);

  if (!existingClass && evaluation.classDescription) {
    monitorDb.messageClasses.create({
      classId: generateClassId(),
      className: evaluation.evalClass,
      description: evaluation.classDescription,
    });
    newClasses.add(evaluation.evalClass);
  } else if (existingClass) {
    monitorDb.messageClasses.incrementFrequency(evaluation.evalClass);
  }
}

async function evaluateMessage(
  message: Message,
  existingClassesText: string,
  newClasses: Set<string>
): Promise<EvaluatedMessage> {
  // Skip system messages
  if (message.role === 'system') {
    return {
      messageId: message.messageId,
      skipped: true,
      reason: 'System message'
    };
  }

  // Skip already evaluated messages
  if (message.evalOk) {
    return {
      messageId: message.messageId,
      skipped: true,
      reason: 'Already evaluated'
    };
  }

  try {
    const prompt = buildEvaluationPrompt(message, existingClassesText);
    const evaluation = await callLLMForEvaluation(prompt);

    await handleMessageClass(evaluation, newClasses);

    monitorDb.messages.updateEvaluation(message.messageId, {
      evalOk: evaluation.evalOk,
      reviewOk: evaluation.reviewOk,
      evalClass: evaluation.evalClass,
    });

    return {
      messageId: message.messageId,
      evalClass: evaluation.evalClass,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      newClass: newClasses.has(evaluation.evalClass)
    };
  } catch (error) {
    return {
      messageId: message.messageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json();

    if (!callId) {
      return createErrorResponse('callId is required', 400);
    }

    const messages = monitorDb.messages.getForCall(callId);

    if (messages.length === 0) {
      return createErrorResponse('No messages found for this call', 404);
    }

    const existingClassesText = await getExistingClassesText();
    const evaluatedMessages: EvaluatedMessage[] = [];
    const newClasses: Set<string> = new Set();

    for (const message of messages) {
      const result = await evaluateMessage(message, existingClassesText, newClasses);
      evaluatedMessages.push(result);
    }

    return NextResponse.json({
      success: true,
      callId,
      totalMessages: messages.length,
      evaluatedCount: evaluatedMessages.filter(m => !m.skipped && !m.error).length,
      skippedCount: evaluatedMessages.filter(m => m.skipped).length,
      errorCount: evaluatedMessages.filter(m => m.error).length,
      newClassesCreated: Array.from(newClasses),
      results: evaluatedMessages
    });

  } catch (error) {
    return handleApiError(error, 'Message evaluation');
  }
}
