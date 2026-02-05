import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "WAhoMTNdLdMoq1j3wf3I";

/**
 * Simple in-memory TTS cache to avoid redundant ElevenLabs calls.
 * Key: SHA-256 hash of text, Value: { audio: Uint8Array, expiry: number }
 */
const ttsCache = new Map<string, { audio: Uint8Array; expiry: number }>();
const TTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const TTS_CACHE_MAX_ENTRIES = 50;

function getTTSCacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function cleanTTSCache(): void {
  if (ttsCache.size <= TTS_CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of ttsCache) {
    if (now > entry.expiry) ttsCache.delete(key);
  }
  // If still over limit, remove oldest entries
  if (ttsCache.size > TTS_CACHE_MAX_ENTRIES) {
    const entries = [...ttsCache.entries()];
    entries.sort((a, b) => a[1].expiry - b[1].expiry);
    const toRemove = entries.slice(0, entries.length - TTS_CACHE_MAX_ENTRIES);
    for (const [key] of toRemove) ttsCache.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check TTS cache
    const cacheKey = getTTSCacheKey(text);
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return new NextResponse(cached.audio.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.audio.byteLength.toString(),
          'X-TTS-Cache': 'hit',
        },
      });
    }

    // Split long text into sentence chunks for better TTS quality
    const chunks = text.length > 500 ? splitIntoSentences(text) : [text];
    const audioBuffers: ArrayBuffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: chunk.trim(),
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.8,
            similarity_boost: 0.5
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return NextResponse.json(
          {
            success: false,
            error: `ElevenLabs TTS error (${response.status}): ${errorText}`
          },
          { status: response.status }
        );
      }

      audioBuffers.push(await response.arrayBuffer());
    }

    // Concatenate all audio chunks
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Store in cache
    ttsCache.set(cacheKey, { audio: combined, expiry: Date.now() + TTS_CACHE_TTL });
    cleanTTSCache();

    return new NextResponse(combined.buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': totalLength.toString(),
      },
    });
  } catch (error) {
    logger.error('Text-to-speech API error:', { error });

    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

/**
 * Split text into sentence-sized chunks for TTS processing.
 * Keeps chunks between 100-500 characters for optimal TTS quality.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > 500 && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}