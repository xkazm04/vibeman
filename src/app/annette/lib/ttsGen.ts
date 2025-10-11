import { LogEntry } from './typesAnnette';

/**
 * Generates text-to-speech audio from the given text
 */
export async function generateTextToSpeech(
  text: string,
  logId: string,
  updateLog: (logId: string, updates: Partial<LogEntry>) => void,
  addLog: (type: LogEntry['type'], message: string, data?: any) => void
): Promise<void> {
  try {
    const response = await fetch('/api/voicebot/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      updateLog(logId, { audioUrl, audioLoading: false });

      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);

      addLog('system', 'Speech audio generated and playing');
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown TTS error' }));
      updateLog(logId, { audioError: errorData.error, audioLoading: false });
      addLog('system', `TTS Error: ${errorData.error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
    updateLog(logId, { audioError: errorMessage, audioLoading: false });
    addLog('system', `TTS Error: ${errorMessage}`);
  }
}

/**
 * Plays audio from the given URL
 */
export function playAudio(audioUrl: string): void {
  const audio = new Audio(audioUrl);
  audio.play().catch(console.error);
}
