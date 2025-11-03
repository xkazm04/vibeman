/**
 * Analytics Wrapper for Voicebot Commands
 * Wraps voicebot operations with analytics tracking
 */

import { logCommandExecution } from './analyticsService';

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
