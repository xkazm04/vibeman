/**
 * Analytics Wrapper for Voicebot Commands
 * Wraps voicebot operations with analytics tracking and LLM response caching
 *
 * This module consolidates caching logic at the API layer so that:
 * - API calls directly benefit from cache without duplicated cache checks
 * - Analytics are tracked alongside cache hits/misses
 * - Single responsibility for tracking + caching
 */

import { logCommandExecution } from './analyticsService';
import {
  getCachedResponse,
  setCachedResponse,
  ResponseCacheConfig,
  ConversationMessage,
  LLMProvider
} from '@/lib/voice';

/**
 * Wrap a voicebot command with analytics tracking
 */
export async function trackCommand<T>(
  projectId: string,
  commandName: string,
  commandType: 'button_command' | 'voice_command' | 'text_command',
  fn: () => Promise<T>,
  metadata?: {
    provider?: string;
    model?: string;
    toolsUsed?: string[];
  }
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    const executionTimeMs = Date.now() - startTime;

    // Log asynchronously to avoid blocking
    logCommandExecution({
      projectId,
      commandName,
      commandType,
      executionTimeMs,
      success,
      errorMessage,
      metadata,
    }).catch(() => {
      // Analytics logging failed - non-blocking, silently continue
    });
  }
}

/**
 * Track TTS playback with analytics
 */
export async function trackTTSPlayback(
  projectId: string,
  commandName: string,
  ttsFunction: () => Promise<string>
): Promise<string> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    const audioUrl = await ttsFunction();
    success = true;
    return audioUrl;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'TTS failed';
    throw error;
  } finally {
    const ttsMs = Date.now() - startTime;

    // Log asynchronously
    logCommandExecution({
      projectId,
      commandName: `${commandName}_tts`,
      commandType: 'text_command',
      executionTimeMs: ttsMs,
      success,
      errorMessage,
      timing: {
        ttsMs,
        totalMs: ttsMs,
      },
    }).catch(() => {
      // TTS analytics logging failed - non-blocking, silently continue
    });
  }
}

/**
 * LLM request parameters for cached API calls
 */
export interface CachedLLMRequestParams {
  message: string;
  conversationHistory?: ConversationMessage[];
  provider?: LLMProvider;
  model?: string;
  cacheConfig?: ResponseCacheConfig;
}

/**
 * LLM response result with cache metadata
 */
export interface CachedLLMResponse {
  response: string;
  fromCache: boolean;
  cacheKey?: string;
}

/**
 * Wrap an LLM API call with integrated caching and analytics tracking
 *
 * This consolidates caching at the API level so consumers don't need to
 * manually check/set cache. The wrapper:
 * 1. Checks cache before making API call
 * 2. If cache hit, returns cached response with analytics logged
 * 3. If cache miss, executes API call and caches the result
 * 4. Logs analytics for both cache hits and API calls
 *
 * @example
 * ```ts
 * const result = await trackLLMWithCache(
 *   projectId,
 *   'voice_query',
 *   {
 *     message: 'Hello',
 *     conversationHistory: [],
 *     provider: 'ollama',
 *     cacheConfig: { enabled: true, ttl: 3600000 }
 *   },
 *   async () => {
 *     // This only runs on cache miss
 *     const response = await fetch('/api/voicebot/llm', { ... });
 *     return response.json();
 *   }
 * );
 *
 * if (result.fromCache) {
 *   console.log('Used cached response');
 * }
 * ```
 */
export async function trackLLMWithCache(
  projectId: string,
  commandName: string,
  params: CachedLLMRequestParams,
  apiFn: () => Promise<{ response: string; [key: string]: unknown }>
): Promise<CachedLLMResponse> {
  const { message, conversationHistory, provider, model, cacheConfig = { enabled: true } } = params;
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let fromCache = false;

  try {
    // Step 1: Check cache if enabled
    if (cacheConfig.enabled !== false) {
      const cached = await getCachedResponse(
        message,
        conversationHistory,
        provider,
        model,
        cacheConfig
      );

      if (cached) {
        fromCache = true;
        success = true;

        // Log cache hit with minimal execution time
        const executionTimeMs = Date.now() - startTime;
        logCommandExecution({
          projectId,
          commandName,
          commandType: 'text_command',
          executionTimeMs,
          success: true,
          metadata: {
            provider,
            model,
            cacheHit: true
          }
        }).catch(() => {
          // Analytics logging failed - non-blocking
        });

        return {
          response: cached.assistantText,
          fromCache: true,
          cacheKey: cached.key
        };
      }
    }

    // Step 2: Cache miss - execute API call
    const apiResult = await apiFn();
    success = true;

    // Step 3: Cache the response for future use (async, non-blocking)
    if (cacheConfig.enabled !== false && apiResult.response) {
      setCachedResponse(
        message,
        apiResult.response,
        undefined, // Audio URL handled separately by TTS
        conversationHistory,
        provider,
        model,
        cacheConfig
      ).catch(err => {
        console.warn('[analyticsWrapper] Failed to cache LLM response:', err);
      });
    }

    return {
      response: apiResult.response,
      fromCache: false
    };
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    // Log analytics for API call (not cache hit - that's logged above)
    if (!fromCache) {
      const executionTimeMs = Date.now() - startTime;

      logCommandExecution({
        projectId,
        commandName,
        commandType: 'text_command',
        executionTimeMs,
        success,
        errorMessage,
        metadata: {
          provider,
          model,
          cacheHit: false
        }
      }).catch(() => {
        // Analytics logging failed - non-blocking, silently continue
      });
    }
  }
}

/**
 * Update cached response with additional data (e.g., audio URL after TTS)
 *
 * Use this after TTS processing to update the cached LLM response with
 * the generated audio URL for faster subsequent playback.
 */
export async function updateCachedLLMResponse(
  message: string,
  assistantText: string,
  audioUrl: string | undefined,
  conversationHistory?: ConversationMessage[],
  provider?: LLMProvider,
  model?: string,
  cacheConfig: ResponseCacheConfig = { enabled: true }
): Promise<void> {
  if (cacheConfig.enabled === false) {
    return;
  }

  try {
    await setCachedResponse(
      message,
      assistantText,
      audioUrl,
      conversationHistory,
      provider,
      model,
      cacheConfig
    );
  } catch (err) {
    console.warn('[analyticsWrapper] Failed to update cached response with audio URL:', err);
  }
}
