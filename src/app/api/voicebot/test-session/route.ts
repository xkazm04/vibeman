/**
 * POST /api/voicebot/test-session
 * Unified voice pipeline test endpoint.
 * Accepts text, processes through configurable pipeline, returns per-stage timing.
 * When includeTts=true, returns base64 audio for client playback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrate, ConversationMessage } from '@/lib/annette/orchestrator';
import { synthesizeSpeech } from '@/app/api/voicebot/text-to-speech/route';
import { llmManager } from '@/lib/llm/llm-manager';
import { logger } from '@/lib/logger';

interface TestSessionRequest {
  message: string;
  pipeline: 'annette' | 'simple';
  projectId?: string;
  projectPath?: string;
  conversationHistory?: ConversationMessage[];
  includeTts?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestSessionRequest = await request.json();
    const {
      message,
      pipeline = 'annette',
      projectId = 'test',
      projectPath,
      conversationHistory,
      includeTts = false,
    } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'message is required' },
        { status: 400 }
      );
    }

    const totalStart = Date.now();
    let response = '';
    let model = '';
    let llmMs = 0;
    let ttsMs: number | undefined;
    let ttsCached: boolean | undefined;
    let audioBase64: string | undefined;

    if (pipeline === 'annette') {
      // Full orchestrator pipeline (Claude Haiku 4.5 + tools + brain context)
      const llmStart = Date.now();
      const result = await orchestrate({
        message,
        projectId,
        projectPath,
        conversationHistory,
        audioMode: true,
      });
      llmMs = Date.now() - llmStart;
      response = result.response;
      model = result.model;
    } else {
      // Simple pipeline — direct Gemini 3 Flash call via llmManager (no tools)
      const llmStart = Date.now();
      const result = await llmManager.generate({
        prompt: message,
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        temperature: 0.7,
        maxTokens: 150,
        systemPrompt: 'You are a helpful AI assistant. Keep responses brief.',
      });
      llmMs = Date.now() - llmStart;
      response = result.response || 'No response generated';
      model = result.model || 'gemini-3-flash-preview';
    }

    // Optionally run TTS and return audio for playback
    if (includeTts && response) {
      try {
        const ttsResult = await synthesizeSpeech(response);
        ttsMs = ttsResult.durationMs;
        ttsCached = ttsResult.cached;
        // Encode audio as base64 for client-side playback
        const bytes = ttsResult.audio;
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
      } catch (err) {
        // TTS failure shouldn't fail the whole test
        ttsMs = -1;
        logger.warn('TTS failed during test session', { error: err });
      }
    }

    const totalMs = Date.now() - totalStart;

    return NextResponse.json({
      success: true,
      response,
      model,
      pipeline,
      timing: {
        llmMs,
        ttsMs,
        ttsCached,
        totalMs,
      },
      audioBase64,
    });
  } catch (error) {
    logger.error('Test session error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
