/**
 * Voicebot API Operations
 * Handles all API calls for voice interaction
 */

import { SpeechToTextResponse, LLMResponse, ConversationMessage, LLMProvider } from './voicebotTypes';
import { trackCommand, trackTTSPlayback } from './analyticsWrapper';

/**
 * Convert speech to text using ElevenLabs STT
 */
export async function speechToText(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');

  const response = await fetch('/api/voicebot/speech-to-text', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Speech-to-text conversion failed');
  }

  const data: SpeechToTextResponse = await response.json();
  
  if (!data.success || !data.text) {
    throw new Error(data.error || 'Failed to convert speech to text');
  }

  return data.text;
}

/**
 * Get LLM response via unified LLM manager
 */
export async function getLLMResponse(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string
): Promise<string> {
  const response = await fetch('/api/voicebot/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model,
      message,
      conversationHistory,
      systemPrompt: 'You are a helpful AI assistant in a voice conversation. Keep responses concise and natural for spoken dialogue.',
      temperature: 0.7,
      maxTokens: 150
    })
  });

  if (!response.ok) {
    throw new Error('LLM request failed');
  }

  const data: LLMResponse = await response.json();
  
  if (!data.success || !data.response) {
    throw new Error(data.error || 'Failed to get LLM response');
  }

  return data.response;
}

/**
 * Convert text to speech using ElevenLabs TTS
 * Note: This function does NOT include analytics tracking.
 * Use trackTTSPlayback wrapper from analyticsWrapper.ts for analytics.
 */
export async function textToSpeech(text: string): Promise<string> {
  const response = await fetch('/api/voicebot/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('Text-to-speech conversion failed');
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  return audioUrl;
}

/**
 * Full async pipeline: STT → LLM → TTS
 */
export async function processVoiceMessage(
  audioBlob: Blob,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string
): Promise<{
  userText: string;
  assistantText: string;
  audioUrl: string;
  timing: {
    sttMs: number;
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}> {
  const startTotal = Date.now();
  
  // Step 1: Speech to text
  const startStt = Date.now();
  const userText = await speechToText(audioBlob);
  const sttMs = Date.now() - startStt;

  // Step 2: Get LLM response
  const startLlm = Date.now();
  const assistantText = await getLLMResponse(userText, conversationHistory, provider, model);
  const llmMs = Date.now() - startLlm;

  // Step 3: Text to speech
  const startTts = Date.now();
  const audioUrl = await textToSpeech(assistantText);
  const ttsMs = Date.now() - startTts;

  const totalMs = Date.now() - startTotal;

  return {
    userText,
    assistantText,
    audioUrl,
    timing: { sttMs, llmMs, ttsMs, totalMs }
  };
}

/**
 * Text-only pipeline: Text → LLM → TTS (for conversation testing)
 */
export async function processTextMessage(
  text: string,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string
): Promise<{
  userText: string;
  assistantText: string;
  audioUrl: string;
  timing: {
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}> {
  const startTotal = Date.now();
  
  // Step 1: Get LLM response
  const startLlm = Date.now();
  const assistantText = await getLLMResponse(text, conversationHistory, provider, model);
  const llmMs = Date.now() - startLlm;

  // Step 2: Text to speech
  const startTts = Date.now();
  const audioUrl = await textToSpeech(assistantText);
  const ttsMs = Date.now() - startTts;

  const totalMs = Date.now() - startTotal;

  return {
    userText: text,
    assistantText,
    audioUrl,
    timing: { llmMs, ttsMs, totalMs }
  };
}
