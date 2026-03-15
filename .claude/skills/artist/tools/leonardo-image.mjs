#!/usr/bin/env node

/**
 * Leonardo AI Image Tool — Generate images and remove backgrounds via Leonardo AI API
 *
 * Commands:
 *   generate  --prompt "..." --output path.png [--width 1024] [--height 768] [--style dynamic] [--contrast 3.5] [--transparent]
 *   remove-bg --id <imageId> --output path-nobg.png
 *   poll      --id <generationId>
 *
 * Requires LEONARDO_API_KEY environment variable.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const API_KEY = process.env.LEONARDO_API_KEY;
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const LUCID_ORIGIN_MODEL = '7b592283-e8a7-4c5a-9ba6-d18c31f258b9';

const STYLE_UUIDS = {
  bokeh:     '9fdc5e8c-4d13-49b4-9ce6-5a74cbb19177',
  cinematic: 'a5632c7c-ddbb-4e2f-ba34-8456ab3ac436',
  dynamic:   '111dc692-d470-4eec-b791-3475abac4c46',
  fashion:   '594c4a08-a522-4e0e-b7ff-e4dac4b6b622',
  portrait:  '8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd',
  vibrant:   'dee282d3-891f-4f73-ba02-7f8131e5541b',
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else { args[key] = true; }
    } else { positional.push(argv[i]); }
  }
  return { command: positional[0], args };
}

function fail(obj) { console.error(JSON.stringify(obj)); process.exit(1); }

async function apiRequest(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: { 'accept': 'application/json', 'authorization': `Bearer ${API_KEY}` } };
  if (body) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  if (!res.ok) { const t = await res.text(); fail({ error: `Leonardo API ${res.status}`, path, details: t.slice(0, 500) }); }
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollGeneration(generationId) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const data = await apiRequest('GET', `/generations/${generationId}`);
    const gen = data.generations_by_pk;
    if (!gen) fail({ error: 'Generation not found', generationId });
    if (gen.status === 'COMPLETE') return gen;
    if (gen.status === 'FAILED') fail({ error: 'Generation failed', generationId });
    process.stderr.write(`[leonardo] polling... status=${gen.status} attempt=${i + 1}/${MAX_POLL_ATTEMPTS}\n`);
    await sleep(POLL_INTERVAL_MS);
  }
  fail({ error: 'Generation timed out', generationId });
}

async function generateImage(prompt, outputPath, opts = {}) {
  if (!API_KEY) fail({ error: 'LEONARDO_API_KEY not set in environment' });

  const width = parseInt(opts.width || '1024', 10);
  const height = parseInt(opts.height || '768', 10);
  const contrast = parseFloat(opts.contrast || '3.5');
  const styleName = (opts.style || 'dynamic').toLowerCase();
  const styleUUID = STYLE_UUIDS[styleName];

  const body = { prompt, modelId: LUCID_ORIGIN_MODEL, width, height, num_images: 1, contrast, alchemy: false, ultra: false };
  if (styleUUID) body.styleUUID = styleUUID;

  process.stderr.write(`[leonardo] generating: ${width}x${height} style=${styleName} contrast=${contrast}\n`);

  const submitData = await apiRequest('POST', '/generations', body);
  const generationId = submitData.sdGenerationJob?.generationId;
  if (!generationId) fail({ error: 'No generationId returned', response: submitData });

  process.stderr.write(`[leonardo] generationId=${generationId}\n`);
  const gen = await pollGeneration(generationId);
  const images = gen.generated_images || [];
  if (images.length === 0) fail({ error: 'No images', generationId });

  const image = images[0];
  const imgRes = await fetch(image.url);
  if (!imgRes.ok) fail({ error: `Download failed: ${imgRes.status}` });
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  const absPath = resolve(outputPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, imgBuffer);

  // Auto-cleanup unless --no-cleanup
  if (!opts['no-cleanup']) {
    try { await apiRequest('DELETE', `/generations/${generationId}`); process.stderr.write(`[leonardo] cloud cleaned\n`); }
    catch (e) { process.stderr.write(`[leonardo] cleanup failed: ${e.message}\n`); }
  }

  console.log(JSON.stringify({ success: true, output: absPath, generationId, imageId: image.id, sizeBytes: imgBuffer.length, url: image.url }, null, 2));
}

async function removeBackground(inputImageId, outputPath) {
  if (!API_KEY) fail({ error: 'LEONARDO_API_KEY not set in environment' });
  process.stderr.write(`[leonardo] removing bg for imageId=${inputImageId}\n`);
  const submitData = await apiRequest('POST', '/variations/nobg', { id: inputImageId, isVariation: false });
  const jobId = submitData.sdNobgJob?.id;
  if (!jobId) fail({ error: 'No job ID', response: submitData });

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const data = await apiRequest('GET', `/variations/${jobId}`);
    const v = data.generated_image_variation_generic?.[0];
    if (v?.status === 'COMPLETE' && v?.url) {
      const imgRes = await fetch(v.url);
      if (!imgRes.ok) fail({ error: `Download failed: ${imgRes.status}` });
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const absPath = resolve(outputPath);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, imgBuffer);
      console.log(JSON.stringify({ success: true, output: absPath, sizeBytes: imgBuffer.length, url: v.url }, null, 2));
      return;
    }
    if (v?.status === 'FAILED') fail({ error: 'BG removal failed', jobId });
    process.stderr.write(`[leonardo] bg removal polling... attempt=${i + 1}\n`);
    await sleep(POLL_INTERVAL_MS);
  }
  fail({ error: 'BG removal timed out', jobId });
}

const { command, args } = parseArgs(process.argv);
switch (command) {
  case 'generate':
    if (!args.prompt || !args.output) { console.error('Usage: leonardo-image.mjs generate --prompt "..." --output path.png [--width 1024] [--height 768] [--style dynamic] [--contrast 3.5]'); process.exit(1); }
    generateImage(args.prompt, args.output, args); break;
  case 'remove-bg':
    if (!args.id || !args.output) { console.error('Usage: leonardo-image.mjs remove-bg --id <imageId> --output path.png'); process.exit(1); }
    removeBackground(args.id, args.output); break;
  case 'poll':
    if (!args.id) { console.error('Usage: leonardo-image.mjs poll --id <generationId>'); process.exit(1); }
    pollGeneration(args.id).then((g) => console.log(JSON.stringify(g, null, 2))); break;
  default:
    console.error(`Unknown command: ${command || '(none)'}\nCommands: generate, remove-bg, poll`); process.exit(1);
}
