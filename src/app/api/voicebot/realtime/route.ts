import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const dynamic = 'force-dynamic';

// This endpoint handles audio-to-text conversion and gets AI response
export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { audioData, conversationHistory = [] } = await request.json();

    if (!audioData) {
      return NextResponse.json(
        { success: false, error: 'No audio data provided' },
        { status: 400 }
      );
    }

    const startTotal = Date.now();

    // Step 1: Convert audio to text using Whisper API
    const startStt = Date.now();
    const audioBuffer = Buffer.from(audioData, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioBlob, 'audio.wav');
    whisperFormData.append('model', 'whisper-1');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      return NextResponse.json(
        { success: false, error: `Transcription failed: ${error}` },
        { status: whisperResponse.status }
      );
    }

    const transcription = await whisperResponse.json();
    const userText = transcription.text;
    const sttMs = Date.now() - startStt;

    // Step 2: Get AI response using GPT-4
    const startLlm = Date.now();
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant in a voice conversation. Keep responses concise and natural for spoken dialogue.'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userText
      }
    ];

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      return NextResponse.json(
        { success: false, error: `Chat completion failed: ${error}` },
        { status: chatResponse.status }
      );
    }

    const chatData = await chatResponse.json();
    const assistantText = chatData.choices[0]?.message?.content || 'I apologize, but I encountered an issue.';
    const llmMs = Date.now() - startLlm;

    // Step 3: Convert AI response to speech using TTS API
    const startTts = Date.now();
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: assistantText,
        voice: 'alloy',
        response_format: 'mp3'
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      logger.error('TTS failed:', { error });
      // Continue even if TTS fails
    }

    let audioUrl: string | undefined;
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    }
    const ttsMs = Date.now() - startTts;
    const totalMs = Date.now() - startTotal;

    return NextResponse.json({
      success: true,
      userText,
      assistantText,
      audioUrl,
      timing: {
        sttMs,
        llmMs,
        ttsMs,
        totalMs
      },
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: userText },
        { role: 'assistant', content: assistantText }
      ]
    });

  } catch (error) {
    logger.error('Realtime API error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
