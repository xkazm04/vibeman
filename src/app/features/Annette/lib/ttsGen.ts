/**
 * Text-to-Speech Generation Utilities
 * Wrapper around voicebotApi for backward compatibility
 */

import { textToSpeech as voicebotTextToSpeech } from './voicebotApi';

type LogType = 'system' | 'user' | 'tool' | 'llm';

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
  addLog?: (type: LogType, message: string, data?: any) => void
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

    await playAudio(audioUrl);

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
 * Play audio from URL
 * @param audioUrl - URL of audio to play
 * @returns Promise that resolves when audio finishes playing
 */
export async function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };

    audio.play().catch(reject);
  });
}

/**
 * Generate and play text-to-speech in one call
 * @param text - Text to convert and play
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(text: string): Promise<void> {
  const audioUrl = await generateTextToSpeech(text);
  await playAudio(audioUrl);
}
