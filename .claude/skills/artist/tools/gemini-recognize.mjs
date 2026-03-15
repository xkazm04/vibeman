#!/usr/bin/env node

/**
 * Gemini Vision — Analyze/recognize images for iteration feedback.
 * Usage: gemini-recognize.mjs --input path.png --prompt "describe..."
 * Requires GEMINI_API_KEY environment variable.
 */

import { readFileSync } from 'fs';
import { resolve, extname } from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-3-flash-preview';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else { args[key] = true; }
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.input || !args.prompt) {
  console.error('Usage: gemini-recognize.mjs --input path.png --prompt "describe..."');
  process.exit(1);
}
if (!API_KEY) {
  console.error(JSON.stringify({ error: 'GEMINI_API_KEY not set' }));
  process.exit(1);
}

const absPath = resolve(args.input);
const base64Data = readFileSync(absPath).toString('base64');
const ext = extname(absPath).toLowerCase();
const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const mimeType = mimeMap[ext] || 'image/png';

const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
const body = {
  contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64Data } }, { text: args.prompt }] }],
  generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
};

const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
if (!res.ok) { const t = await res.text(); console.error(JSON.stringify({ error: `Gemini ${res.status}`, details: t.slice(0, 500) })); process.exit(1); }
const data = await res.json();
let text = '';
for (const c of data.candidates || []) for (const p of c.content?.parts || []) if (p.text) text += p.text;
console.log(JSON.stringify({ success: true, input: absPath, analysis: text }, null, 2));
