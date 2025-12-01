/**
 * Text-to-Speech Generation Utilities
 * Wrapper around voicebotApi for Annette-specific TTS functionality
 */

import { textToSpeech as voicebotTextToSpeech } from './voicebotApi';
import { playAudio as sharedPlayAudio } from '@/lib/voice/ttsGen';

type LogType = 'system' | 'user' | 'tool' | 'llm';

/**
 * Re-export playAudio from shared lib
 */
export { sharedPlayAudio as playAudio };

/**
 * Generate text-to-speech audio and play it (with logging support)
 * @param text - Text to convert to speech
 * @param logId - Optional log entry ID for tracking
 * @param updateLog - Optional function to update log entry
 * @param addLog - Optional function to add new log entry
 * @returns Promise resolving when audio finishes playing
 */
export async function generateTextToSpeech(
  text: string,
  logId?: string,
  updateLog?: (id: string, updates: { audioUrl?: string; ttsCompleted?: boolean }) => void,
  addLog?: (type: LogType, message: string, data?: Record<string, unknown>) => void
): Promise<void> {
  try {
    if (addLog) {
      addLog('system', 'Requesting TTS from API...');
    }

    const audioUrl = await voicebotTextToSpeech(text);

    if (updateLog && logId) {
      updateLog(logId, { audioUrl, ttsCompleted: true });
    }

    if (addLog) {
      addLog('system', 'Playing audio...');
    }

    await sharedPlayAudio(audioUrl);

    if (addLog) {
      addLog('system', 'Audio playback completed');
    }
  } catch (error) {
    if (addLog) {
      addLog('system', `TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Generate and play text-to-speech in one call
 * @param text - Text to convert and play
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(text: string): Promise<void> {
  const audioUrl = await voicebotTextToSpeech(text);
  await sharedPlayAudio(audioUrl);
}
