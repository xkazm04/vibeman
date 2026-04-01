/**
 * Annette TTS API Route
 *
 * POST /api/annette/tts
 * Body: { text: string, voiceId?: string }
 * Response: audio/mpeg stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, formatForSpeech } from '@/lib/annette/tts/elevenlabs';
import { withObservability } from '@/lib/observability/middleware';
import { logger } from '@/lib/logger';

const log = logger.child('annette-tts');

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body as { text?: string; voiceId?: string };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Format the text for natural speech
    const spoken = formatForSpeech(text);

    if (spoken.length === 0) {
      return NextResponse.json(
        { error: 'After formatting, no speakable text remained' },
        { status: 400 }
      );
    }

    log.debug('TTS request', { originalLength: text.length, spokenLength: spoken.length, voiceId });

    const { audio, contentType } = await synthesizeSpeech(spoken, voiceId ? { voiceId } : undefined);

    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audio.byteLength.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS synthesis failed';
    log.error('Annette TTS error', { error: message });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/annette/tts');
