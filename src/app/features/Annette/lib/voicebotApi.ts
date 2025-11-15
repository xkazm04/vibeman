/**
 * Voicebot API Operations
 * Handles all API calls for voice interaction
 */

import { SpeechToTextResponse, LLMResponse, ConversationMessage, LLMProvider } from './voicebotTypes';
import { trackCommand, trackTTSPlayback } from './analyticsWrapper';
import { getCachedAudio, setCachedAudio } from './ttsCache';
import {
  getCachedResponse,
  setCachedResponse,
  ResponseCacheConfig
} from './voicebotResponseCache';

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
 * Get LLM response via unified LLM manager with response caching
 */
export async function getLLMResponse(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string,
  cacheConfig: ResponseCacheConfig = { enabled: true }
): Promise<string> {
  // Check cache first (if enabled)
  if (cacheConfig.enabled !== false) {
    const cached = await getCachedResponse(
      message,
      conversationHistory,
      provider,
      model,
      cacheConfig
    );

    if (cached) {
      console.log('LLM Response cache: Using cached response');
      return cached.assistantText;
    }
  }

  // Cache miss - fetch from API
  console.log('LLM Response cache: Fetching from API');
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

  // Cache the response for future use (async, non-blocking)
  if (cacheConfig.enabled !== false) {
    setCachedResponse(
      message,
      data.response,
      undefined, // Audio URL not available at this stage
      conversationHistory,
      provider,
      model,
      cacheConfig
    ).catch(err => {
      console.warn('Failed to cache LLM response:', err);
    });
  }

  return data.response;
}

/**
 * Convert text to speech using ElevenLabs TTS with IndexedDB caching
 * Note: This function does NOT include analytics tracking.
 * Use trackTTSPlayback wrapper from analyticsWrapper.ts for analytics.
 */
export async function textToSpeech(text: string): Promise<string> {
  // Check cache first
  const cachedBlob = await getCachedAudio(text);

  if (cachedBlob) {
    console.log('TTS: Using cached audio');
    const audioUrl = URL.createObjectURL(cachedBlob);
    return audioUrl;
  }

  // Cache miss - fetch from API
  console.log('TTS: Fetching from API');
  const response = await fetch('/api/voicebot/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('Text-to-speech conversion failed');
  }

  const audioBlob = await response.blob();

  // Cache the audio blob for future use (async, non-blocking)
  setCachedAudio(text, audioBlob).catch(err => {
    console.warn('Failed to cache TTS audio:', err);
  });

  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

/**
 * Full async pipeline: STT → LLM → TTS with response caching
 */
export async function processVoiceMessage(
  audioBlob: Blob,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string,
  cacheConfig: ResponseCacheConfig = { enabled: true }
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

  // Step 2: Get LLM response (with response caching)
  const startLlm = Date.now();
  const assistantText = await getLLMResponse(userText, conversationHistory, provider, model, cacheConfig);
  const llmMs = Date.now() - startLlm;

  // Step 3: Text to speech (with TTS caching)
  const startTts = Date.now();
  const audioUrl = await textToSpeech(assistantText);
  const ttsMs = Date.now() - startTts;

  const totalMs = Date.now() - startTotal;

  // Update cache with audio URL if response was cached
  if (cacheConfig.enabled !== false) {
    setCachedResponse(
      userText,
      assistantText,
      audioUrl,
      conversationHistory,
      provider,
      model,
      cacheConfig
    ).catch(err => {
      console.warn('Failed to update cached response with audio URL:', err);
    });
  }

  return {
    userText,
    assistantText,
    audioUrl,
    timing: { sttMs, llmMs, ttsMs, totalMs }
  };
}

/**
 * Text-only pipeline: Text → LLM → TTS (for conversation testing) with response caching
 */
export async function processTextMessage(
  text: string,
  conversationHistory: ConversationMessage[] = [],
  provider: LLMProvider = 'ollama',
  model?: string,
  cacheConfig: ResponseCacheConfig = { enabled: true }
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

  // Step 1: Get LLM response (with response caching)
  const startLlm = Date.now();
  const assistantText = await getLLMResponse(text, conversationHistory, provider, model, cacheConfig);
  const llmMs = Date.now() - startLlm;

  // Step 2: Text to speech (with TTS caching)
  const startTts = Date.now();
  const audioUrl = await textToSpeech(assistantText);
  const ttsMs = Date.now() - startTts;

  const totalMs = Date.now() - startTotal;

  // Update cache with audio URL if response was cached
  if (cacheConfig.enabled !== false) {
    setCachedResponse(
      text,
      assistantText,
      audioUrl,
      conversationHistory,
      provider,
      model,
      cacheConfig
    ).catch(err => {
      console.warn('Failed to update cached response with audio URL:', err);
    });
  }

  return {
    userText: text,
    assistantText,
    audioUrl,
    timing: { llmMs, ttsMs, totalMs }
  };
}
