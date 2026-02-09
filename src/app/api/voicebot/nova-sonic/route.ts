import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttp2Handler } from '@smithy/node-http-handler';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AWS_REGION = process.env.AWS_NOVA_REGION || 'eu-north-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_NOVA_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_NOVA_SECRET_ACCESS_KEY;
const MODEL_ID = 'amazon.nova-2-sonic-v1:0';
const DEFAULT_VOICE = 'tiffany';

// Nova Sonic audio format constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SAMPLE_SIZE_BITS = 16;
const CHANNELS = 1;

let bedrockClient: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS Nova credentials not configured');
    }
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
      requestHandler: new NodeHttp2Handler({
        requestTimeout: 300000,
        sessionTimeout: 300000,
        disableConcurrentStreams: false,
        maxConcurrentStreams: 20,
      }),
    });
  }
  return bedrockClient;
}

/**
 * Convert WAV/WebM audio blob to raw PCM 16kHz 16-bit mono.
 * For WAV files, strips the header and resamples if needed.
 * For raw PCM input, passes through.
 */
function extractPcmFromWav(buffer: Buffer): Buffer {
  // Check for WAV header (RIFF)
  if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    // Parse WAV header to get format info
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);

    // Find data chunk
    let dataOffset = 44;
    for (let i = 12; i < buffer.length - 8; i++) {
      if (buffer.toString('ascii', i, i + 4) === 'data') {
        dataOffset = i + 8;
        break;
      }
    }

    let pcmData = buffer.subarray(dataOffset);

    // Resample if needed (simple linear interpolation)
    if (sampleRate !== INPUT_SAMPLE_RATE || numChannels !== 1 || bitsPerSample !== 16) {
      pcmData = resamplePcm(pcmData, sampleRate, INPUT_SAMPLE_RATE, numChannels, bitsPerSample);
    }

    return Buffer.from(pcmData);
  }

  // Assume raw PCM if no WAV header
  return buffer;
}

/**
 * Simple PCM resampling: convert to 16kHz mono 16-bit
 */
function resamplePcm(
  input: Buffer,
  fromRate: number,
  toRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const bytesPerSample = bitsPerSample / 8;
  const frameSize = channels * bytesPerSample;
  const numFrames = Math.floor(input.length / frameSize);
  const ratio = fromRate / toRate;
  const outputFrames = Math.floor(numFrames / ratio);
  const output = Buffer.alloc(outputFrames * 2); // 16-bit mono

  for (let i = 0; i < outputFrames; i++) {
    const srcIdx = Math.floor(i * ratio);
    const frameOffset = srcIdx * frameSize;

    if (frameOffset + bytesPerSample > input.length) break;

    let sample: number;
    if (bitsPerSample === 16) {
      sample = input.readInt16LE(frameOffset);
    } else if (bitsPerSample === 32) {
      // Float32 to Int16
      const float = input.readFloatLE(frameOffset);
      sample = Math.max(-32768, Math.min(32767, Math.round(float * 32767)));
    } else {
      sample = (input[frameOffset] - 128) * 256;
    }

    // If stereo, average channels
    if (channels === 2 && frameOffset + frameSize <= input.length) {
      let sample2: number;
      if (bitsPerSample === 16) {
        sample2 = input.readInt16LE(frameOffset + bytesPerSample);
      } else if (bitsPerSample === 32) {
        const float2 = input.readFloatLE(frameOffset + bytesPerSample);
        sample2 = Math.max(-32768, Math.min(32767, Math.round(float2 * 32767)));
      } else {
        sample2 = (input[frameOffset + bytesPerSample] - 128) * 256;
      }
      sample = Math.round((sample + sample2) / 2);
    }

    output.writeInt16LE(sample, i * 2);
  }

  return output;
}

/**
 * Generate a brief silence PCM buffer for text-only mode.
 * Nova Sonic requires audio input, so we send 500ms of silence
 * and rely on the system prompt to convey the question.
 */
function generateSilencePcm(durationMs: number = 500): Buffer {
  const numSamples = Math.floor((INPUT_SAMPLE_RATE * durationMs) / 1000);
  return Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample, all zeros = silence
}

/**
 * Split PCM buffer into ~32ms chunks for streaming
 */
function splitIntoChunks(pcm: Buffer, chunkDurationMs: number = 32): Buffer[] {
  const bytesPerChunk = Math.floor((INPUT_SAMPLE_RATE * 2 * chunkDurationMs) / 1000);
  const chunks: Buffer[] = [];
  for (let i = 0; i < pcm.length; i += bytesPerChunk) {
    chunks.push(pcm.subarray(i, Math.min(i + bytesPerChunk, pcm.length)));
  }
  return chunks;
}

/**
 * Wrap raw PCM data in a WAV header for browser playback
 */
function pcmToWav(pcmData: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmData.length;
  const fileSize = dataSize + 36;

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM format chunk size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * CHANNELS * (SAMPLE_SIZE_BITS / 8), 28); // byte rate
  header.writeUInt16LE(CHANNELS * (SAMPLE_SIZE_BITS / 8), 32); // block align
  header.writeUInt16LE(SAMPLE_SIZE_BITS, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Type for the bidirectional stream events
interface NovaSonicEvent {
  event: Record<string, unknown>;
}

/**
 * Generate the ordered event stream for Nova Sonic
 */
async function* generateInputEvents(
  systemPrompt: string,
  audioChunks: Buffer[],
  voiceId: string
): AsyncGenerator<NovaSonicEvent> {
  const promptName = uuidv4();
  const systemContentName = uuidv4();
  const userContentName = uuidv4();

  // 1. Session start
  yield {
    event: {
      sessionStart: {
        inferenceConfiguration: {
          maxTokens: 1024,
          topP: 0.9,
          temperature: 0.7,
        },
      },
    },
  };

  // 2. Prompt start with audio output config
  yield {
    event: {
      promptStart: {
        promptName,
        textOutputConfiguration: { mediaType: 'text/plain' },
        audioOutputConfiguration: {
          mediaType: 'audio/lpcm',
          sampleRateHertz: OUTPUT_SAMPLE_RATE,
          sampleSizeBits: SAMPLE_SIZE_BITS,
          channelCount: CHANNELS,
          voiceId,
          encoding: 'base64',
          audioType: 'SPEECH',
        },
      },
    },
  };

  // 3. System prompt (text)
  yield {
    event: {
      contentStart: {
        promptName,
        contentName: systemContentName,
        type: 'TEXT',
        role: 'SYSTEM',
        textInputConfiguration: { mediaType: 'text/plain' },
      },
    },
  };

  yield {
    event: {
      textInput: {
        promptName,
        contentName: systemContentName,
        content: systemPrompt,
      },
    },
  };

  yield {
    event: {
      contentEnd: {
        promptName,
        contentName: systemContentName,
      },
    },
  };

  // 4. User audio input
  yield {
    event: {
      contentStart: {
        promptName,
        contentName: userContentName,
        type: 'AUDIO',
        role: 'USER',
        audioInputConfiguration: {
          mediaType: 'audio/lpcm',
          sampleRateHertz: INPUT_SAMPLE_RATE,
          sampleSizeBits: SAMPLE_SIZE_BITS,
          channelCount: CHANNELS,
          audioType: 'SPEECH',
          encoding: 'base64',
        },
      },
    },
  };

  // Stream audio chunks
  for (const chunk of audioChunks) {
    yield {
      event: {
        audioInput: {
          promptName,
          contentName: userContentName,
          content: chunk.toString('base64'),
        },
      },
    };
  }

  yield {
    event: {
      contentEnd: {
        promptName,
        contentName: userContentName,
      },
    },
  };

  // 5. End prompt and session
  yield {
    event: {
      promptEnd: {
        promptName,
      },
    },
  };

  yield {
    event: {
      sessionEnd: {},
    },
  };
}

/**
 * Nova Sonic voice endpoint.
 *
 * Accepts two modes:
 * - Audio mode: Send audio blob for full speech-to-speech processing
 * - Text mode: Send text question (uses silence audio + system prompt instruction)
 *
 * Body (JSON): { audioData?: string (base64), text?: string, voiceId?: string, systemPrompt?: string }
 * Body (FormData): audio file + optional voiceId field
 */
export async function POST(request: NextRequest) {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return NextResponse.json(
      { success: false, error: 'AWS Nova credentials not configured. Set AWS_NOVA_ACCESS_KEY_ID and AWS_NOVA_SECRET_ACCESS_KEY.' },
      { status: 500 }
    );
  }

  const startTotal = Date.now();

  try {
    let audioBuffer: Buffer;
    let voiceId = DEFAULT_VOICE;
    let systemPrompt = 'You are a helpful AI assistant in a voice conversation. Keep responses concise and natural for spoken dialogue. Respond in 1-3 sentences.';
    let isTextMode = false;
    let userTextInput = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // FormData mode (audio file upload)
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      if (!audioFile) {
        return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
      }
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBuffer = extractPcmFromWav(Buffer.from(arrayBuffer));
      voiceId = (formData.get('voiceId') as string) || DEFAULT_VOICE;
      const customPrompt = formData.get('systemPrompt') as string;
      if (customPrompt) systemPrompt = customPrompt;
    } else {
      // JSON mode
      const body = await request.json();
      voiceId = body.voiceId || DEFAULT_VOICE;
      if (body.systemPrompt) systemPrompt = body.systemPrompt;

      if (body.audioData) {
        // Base64 audio data
        audioBuffer = extractPcmFromWav(Buffer.from(body.audioData, 'base64'));
      } else if (body.text) {
        // Text-only mode: embed question in system prompt, send silence as audio
        isTextMode = true;
        userTextInput = body.text;
        systemPrompt = `You are a helpful AI assistant in a voice conversation. Keep responses concise and natural for spoken dialogue. Respond in 1-3 sentences.\n\nThe user is communicating via text input. Their message is: "${body.text}"\n\nRespond naturally to their message.`;
        audioBuffer = generateSilencePcm(500);
      } else {
        return NextResponse.json({ success: false, error: 'Provide either audioData (base64) or text' }, { status: 400 });
      }
    }

    const audioChunks = splitIntoChunks(audioBuffer);

    const client = getClient();
    const inputStream = generateInputEvents(systemPrompt, audioChunks, voiceId);

    const command = new InvokeModelWithBidirectionalStreamCommand({
      modelId: MODEL_ID,
      body: inputStream as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- AWS SDK bidirectional stream typing
    });

    const startNova = Date.now();
    const response = await client.send(command);
    const novaConnectMs = Date.now() - startNova;

    // Collect response events
    let assistantText = '';
    let userTranscript = '';
    const audioOutputBuffers: Buffer[] = [];
    let firstAudioChunkMs: number | null = null;
    const responseStartMs = Date.now();

    if (response.body) {
      for await (const chunk of response.body) {
        const event = chunk as unknown as Record<string, unknown>;

        // Text output (transcription and response)
        if (event.textOutput) {
          const textEvent = event.textOutput as { content?: string; role?: string };
          if (textEvent.content) {
            // Nova Sonic sends both user transcription and assistant response as text
            assistantText += textEvent.content;
          }
        }

        // Audio output chunks
        if (event.audioOutput) {
          const audioEvent = event.audioOutput as { content?: string };
          if (audioEvent.content) {
            if (firstAudioChunkMs === null) {
              firstAudioChunkMs = Date.now() - responseStartMs;
            }
            audioOutputBuffers.push(Buffer.from(audioEvent.content, 'base64'));
          }
        }

        // Content start can indicate role
        if (event.contentStart) {
          const cs = event.contentStart as { role?: string };
          if (cs.role === 'USER') {
            // Next text outputs will be user transcription
          }
        }
      }
    }

    const novaMs = Date.now() - startNova;

    // Combine audio output and wrap in WAV for browser playback
    let audioUrl: string | undefined;
    if (audioOutputBuffers.length > 0) {
      const combinedPcm = Buffer.concat(audioOutputBuffers);
      const wavBuffer = pcmToWav(combinedPcm, OUTPUT_SAMPLE_RATE);
      const base64Wav = wavBuffer.toString('base64');
      audioUrl = `data:audio/wav;base64,${base64Wav}`;
    }

    const totalMs = Date.now() - startTotal;

    return NextResponse.json({
      success: true,
      userText: isTextMode ? userTextInput : (userTranscript || '[audio input]'),
      assistantText: assistantText || 'No response generated',
      audioUrl,
      provider: 'nova-sonic',
      voiceId,
      model: MODEL_ID,
      timing: {
        novaConnectMs,
        novaMs,
        firstAudioChunkMs,
        totalMs,
      },
    });
  } catch (error) {
    logger.error('Nova Sonic API error:', { error });

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Nova Sonic error: ${message}` },
      { status: 500 }
    );
  }
}
