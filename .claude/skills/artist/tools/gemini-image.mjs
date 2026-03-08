#!/usr/bin/env node

/**
 * Gemini Image Tool — Generate and recognize images via Google Gemini API
 *
 * Commands:
 *   generate  --prompt "..." --output path.png [--aspect 16:9]
 *   recognize --input path.png --prompt "describe this image"
 *
 * Requires GEMINI_API_KEY environment variable.
 * No npm dependencies — uses Node.js built-in fetch() and fs.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve, extname } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GENERATE_MODEL = 'gemini-2.0-flash-exp';
const VISION_MODEL = 'gemini-2.0-flash';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      positional.push(argv[i]);
    }
  }
  return { command: positional[0], args };
}

// ---------------------------------------------------------------------------
// Image Generation
// ---------------------------------------------------------------------------

async function generateImage(prompt, outputPath, aspect = '1:1') {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment' }));
    process.exit(1);
  }

  const url = `${BASE_URL}/models/${GENERATE_MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Generate an image: ${prompt}\n\nAspect ratio: ${aspect}. Return ONLY the image, no text.`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.8,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(JSON.stringify({
      error: `Gemini API error ${res.status}`,
      details: errText.slice(0, 500),
    }));
    process.exit(1);
  }

  const data = await res.json();

  // Extract image data from response
  const candidates = data.candidates || [];
  let imageData = null;
  let textResponse = '';

  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData;
      }
      if (part.text) {
        textResponse += part.text;
      }
    }
  }

  if (!imageData) {
    console.error(JSON.stringify({
      error: 'No image generated',
      text: textResponse.slice(0, 300),
      hint: 'Try rephrasing the prompt or using a different aspect ratio',
    }));
    process.exit(1);
  }

  // Save image
  const absPath = resolve(outputPath);
  mkdirSync(dirname(absPath), { recursive: true });
  const buffer = Buffer.from(imageData.data, 'base64');
  writeFileSync(absPath, buffer);

  const result = {
    success: true,
    output: absPath,
    mimeType: imageData.mimeType,
    sizeBytes: buffer.length,
  };
  if (textResponse) {
    result.description = textResponse.slice(0, 500);
  }
  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// Image Recognition
// ---------------------------------------------------------------------------

async function recognizeImage(inputPath, prompt) {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: 'GEMINI_API_KEY not set in environment' }));
    process.exit(1);
  }

  const absPath = resolve(inputPath);
  const imageBuffer = readFileSync(absPath);
  const base64Data = imageBuffer.toString('base64');

  // Determine MIME type from extension
  const ext = extname(absPath).toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const mimeType = mimeMap[ext] || 'image/png';

  const url = `${BASE_URL}/models/${VISION_MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(JSON.stringify({
      error: `Gemini API error ${res.status}`,
      details: errText.slice(0, 500),
    }));
    process.exit(1);
  }

  const data = await res.json();

  const candidates = data.candidates || [];
  let text = '';
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.text) text += part.text;
    }
  }

  console.log(JSON.stringify({
    success: true,
    input: absPath,
    analysis: text,
  }, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { command, args } = parseArgs(process.argv);

switch (command) {
  case 'generate':
    if (!args.prompt || !args.output) {
      console.error('Usage: gemini-image.mjs generate --prompt "..." --output path.png [--aspect 16:9]');
      process.exit(1);
    }
    generateImage(args.prompt, args.output, args.aspect || '1:1');
    break;

  case 'recognize':
    if (!args.input || !args.prompt) {
      console.error('Usage: gemini-image.mjs recognize --input path.png --prompt "describe..."');
      process.exit(1);
    }
    recognizeImage(args.input, args.prompt);
    break;

  default:
    console.error(`Unknown command: ${command || '(none)'}`);
    console.error('Commands: generate, recognize');
    console.error('');
    console.error('  generate --prompt "..." --output path.png [--aspect 16:9]');
    console.error('  recognize --input path.png --prompt "describe this image"');
    process.exit(1);
}
