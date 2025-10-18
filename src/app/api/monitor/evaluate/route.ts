/**
 * Monitor Evaluate API
 * LLM-powered message evaluation endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';
import { AnthropicClient } from '@/lib/llm/providers/anthropic-client';
import fs from 'fs';
import path from 'path';

// Load evaluation prompt template
const PROMPT_PATH = path.join(process.cwd(), 'data', 'prompts', 'message-evaluation.txt');
let evaluationPromptTemplate = '';

try {
  evaluationPromptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
} catch (error) {
  console.error('Failed to load evaluation prompt:', error);
}

interface EvaluationResult {
  evalOk: boolean;
  reviewOk: boolean;
  evalClass: string;
  classDescription?: string;
  confidence: number;
  reasoning: string;
}

function generateClassId(): string {
  return `class_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    // Get all messages for the call
    const messages = await monitorServiceDb.getCallMessages(callId);

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No messages found for this call' },
        { status: 404 }
      );
    }

    // Get existing message classes
    const existingClasses = await monitorServiceDb.getAllMessageClasses();
    const existingClassesText = existingClasses.length > 0
      ? existingClasses.map(c => `- ${c.className}: ${c.description || 'No description'}`).join('\n')
      : 'No existing classes yet';

    // Initialize Anthropic client
    const anthropic = new AnthropicClient({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const evaluatedMessages = [];
    const newClasses: Set<string> = new Set();

    // Evaluate each message
    for (const message of messages) {
      try {
        // Skip system messages
        if (message.role === 'system') {
          evaluatedMessages.push({
            messageId: message.messageId,
            skipped: true,
            reason: 'System message'
          });
          continue;
        }

        // Skip already evaluated messages
        if (message.evalOk) {
          evaluatedMessages.push({
            messageId: message.messageId,
            skipped: true,
            reason: 'Already evaluated'
          });
          continue;
        }

        // Build prompt
        const prompt = evaluationPromptTemplate
          .replace('{{existingClasses}}', existingClassesText)
          .replace('{{role}}', message.role)
          .replace('{{content}}', message.content);

        // Call LLM
        const response = await anthropic.generate({
          prompt,
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 1024,
          temperature: 0.3
        });

        if (!response.success || !response.response) {
          throw new Error('LLM evaluation failed');
        }

        // Parse JSON response
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }

        const evaluation: EvaluationResult = JSON.parse(jsonMatch[0]);

        // Check if we need to create a new class
        if (evaluation.classDescription) {
          const existingClass = await monitorServiceDb.getMessageClassByName(evaluation.evalClass);
          
          if (!existingClass) {
            // Create new class
            await monitorServiceDb.createMessageClass({
              classId: generateClassId(),
              className: evaluation.evalClass,
              description: evaluation.classDescription
            });
            newClasses.add(evaluation.evalClass);
          } else {
            // Increment existing class frequency
            await monitorServiceDb.incrementMessageClassFrequency(evaluation.evalClass);
          }
        } else {
          // Increment existing class frequency
          const existingClass = await monitorServiceDb.getMessageClassByName(evaluation.evalClass);
          if (existingClass) {
            await monitorServiceDb.incrementMessageClassFrequency(evaluation.evalClass);
          }
        }

        // Update message with evaluation
        await monitorServiceDb.updateMessageEvaluation(message.messageId, {
          evalOk: evaluation.evalOk,
          reviewOk: evaluation.reviewOk,
          evalClass: evaluation.evalClass
        });

        evaluatedMessages.push({
          messageId: message.messageId,
          evalClass: evaluation.evalClass,
          confidence: evaluation.confidence,
          reasoning: evaluation.reasoning,
          newClass: newClasses.has(evaluation.evalClass)
        });

      } catch (error) {
        console.error(`Error evaluating message ${message.messageId}:`, error);
        evaluatedMessages.push({
          messageId: message.messageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
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
    console.error('Error in evaluate API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
