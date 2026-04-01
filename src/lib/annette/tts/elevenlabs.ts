/**
 * ElevenLabs Text-to-Speech Client for Annette
 *
 * Converts assistant response text to natural speech using the ElevenLabs API.
 * Includes text preprocessing to strip markdown/code artifacts before synthesis.
 */

import { env } from '@/lib/config/envConfig';
import { logger } from '@/lib/logger';

const log = logger.child('elevenlabs-tts');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;         // default: 'pNInz6obpgDQGcFmaJgB' (Adam)
  modelId?: string;         // default: 'eleven_multilingual_v2'
  stability?: number;       // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
}

const DEFAULTS = {
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  modelId: 'eleven_multilingual_v2',
  stability: 0.5,
  similarityBoost: 0.75,
} as const;

// ---------------------------------------------------------------------------
// Speech synthesis
// ---------------------------------------------------------------------------

/**
 * Convert text to speech using ElevenLabs API.
 * Returns audio as a Buffer (mp3 format).
 */
export async function synthesizeSpeech(
  text: string,
  config?: Partial<ElevenLabsConfig>
): Promise<{ audio: Buffer; contentType: string }> {
  const apiKey = config?.apiKey ?? env.elevenLabsApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured. Set ELEVENLABS_API_KEY.');
  }

  const voiceId = config?.voiceId ?? DEFAULTS.voiceId;
  const modelId = config?.modelId ?? DEFAULTS.modelId;
  const stability = config?.stability ?? DEFAULTS.stability;
  const similarityBoost = config?.similarityBoost ?? DEFAULTS.similarityBoost;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  log.debug('Synthesising speech', {
    voiceId,
    modelId,
    textLength: text.length,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    log.error('ElevenLabs API error', {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`ElevenLabs TTS error (${response.status}): ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audio = Buffer.from(arrayBuffer);

  log.debug('Speech synthesised', { bytes: audio.byteLength });

  return { audio, contentType: 'audio/mpeg' };
}

// ---------------------------------------------------------------------------
// Text formatting for TTS readability
// ---------------------------------------------------------------------------

/**
 * Format response text for TTS readability.
 *
 * - Strip markdown formatting (headers, bold, italic, links)
 * - Convert code blocks to natural language descriptions
 * - Remove quick_options / HTML tags
 * - Shorten URLs
 * - Collapse whitespace and add natural pause markers
 */
export function formatForSpeech(text: string): string {
  let result = text;

  // Remove fenced code blocks, replacing with a spoken description
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n').filter((l) => l.trim() && !l.startsWith('```'));
    if (lines.length === 0) return '';
    if (lines.length <= 2) return ` code: ${lines.join(' ')}. `;
    return ' a code snippet was provided. ';
  });

  // Remove inline code, prefixing with "code:"
  result = result.replace(/`([^`]+)`/g, 'code: $1');

  // Remove markdown headers but keep the text (add pause after)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, '$1.');

  // Remove bold markers
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');

  // Remove italic markers
  result = result.replace(/\*([^*]+)\*/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');

  // Convert markdown links to just the label
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove quick_options tags entirely
  result = result.replace(/<quick_options[\s\S]*?<\/quick_options>/gi, '');
  result = result.replace(/<quick_options[^>]*\/>/gi, '');

  // Strip remaining HTML tags
  result = result.replace(/<[^>]+>/g, '');

  // Shorten URLs to just the hostname
  result = result.replace(/https?:\/\/([^\s/]+)[^\s]*/g, (_, host) => host);

  // Remove markdown list bullets / numbered lists prefix
  result = result.replace(/^\s*[-*+]\s+/gm, '');
  result = result.replace(/^\s*\d+\.\s+/gm, '');

  // Remove markdown horizontal rules
  result = result.replace(/^---+$/gm, '');

  // Collapse multiple newlines into a single period (pause marker)
  result = result.replace(/\n{2,}/g, '. ');

  // Replace remaining newlines with spaces
  result = result.replace(/\n/g, ' ');

  // Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ');

  // Remove double periods that may have been introduced
  result = result.replace(/\.{2,}/g, '.');
  result = result.replace(/\.\s*\./g, '.');

  return result.trim();
}
