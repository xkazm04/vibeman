/**
 * Brain Embeddings — semantic vectors for insight similarity.
 *
 * Upgrades the Brain's similarity layer from lexical Jaccard (bag-of-words) to
 * semantic cosine similarity. Vectors are generated via the configured provider
 * (OpenAI when a key is present, else a local Ollama embedding model) and cached
 * in-memory.
 *
 * Everything here degrades gracefully: if no embedding provider is reachable,
 * `embedTexts` returns a partial/empty map and callers (see `isDuplicateTitle`
 * in insightSimilarity.ts) fall back to the existing lexical path unchanged.
 * This makes adopting embeddings zero-risk for installs without an embed model.
 *
 * Server-only (uses `fetch`, `crypto`, and env). Imported by brainService.
 */

import { env } from '@/lib/config/envConfig';
import { createHash } from 'crypto';

/** Local Ollama embedding model. Pull with: `ollama pull nomic-embed-text`. */
const OLLAMA_EMBED_MODEL = 'nomic-embed-text';
/** OpenAI embedding model — cheap, 1536-dim. */
const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
/** Per-request timeout — embedding must never stall reflection completion. */
const EMBED_TIMEOUT_MS = 4000;
/** Bounded in-memory cache (text hash → vector). */
const MAX_CACHE = 2000;

const cache = new Map<string, number[]>();

function cacheKey(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function cacheGet(text: string): number[] | undefined {
  return cache.get(cacheKey(text));
}

function cacheSet(text: string, vec: number[]): void {
  if (cache.size >= MAX_CACHE) {
    // Evict oldest insertion (Map preserves insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(cacheKey(text), vec);
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Network error / timeout / model unavailable — caller falls back to lexical.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Batch-embed via OpenAI (one request for many inputs). Returns null if no key. */
async function openaiEmbedBatch(texts: string[]): Promise<number[][] | null> {
  const key = env.openaiApiKey();
  if (!key) return null;

  const base = env.openaiBaseUrl() || 'https://api.openai.com/v1';
  const json = (await postJson(
    `${base}/embeddings`,
    { model: OPENAI_EMBED_MODEL, input: texts },
    { Authorization: `Bearer ${key}` },
  )) as { data?: Array<{ embedding?: number[] }> } | null;

  if (!json?.data || json.data.length !== texts.length) return null;
  const vecs = json.data.map((d) => d.embedding);
  return vecs.every((v) => Array.isArray(v)) ? (vecs as number[][]) : null;
}

/** Embed a single text via the local Ollama embeddings endpoint. */
async function ollamaEmbedOne(text: string): Promise<number[] | null> {
  const base = env.ollamaBaseUrl() || 'http://localhost:11434';
  const json = (await postJson(`${base}/api/embeddings`, {
    model: OLLAMA_EMBED_MODEL,
    prompt: text,
  })) as { embedding?: number[] } | null;
  return Array.isArray(json?.embedding) ? json!.embedding : null;
}

/**
 * Embed a batch of texts → Map(trimmed text → vector).
 *
 * Results are cached. Texts that fail to embed (or when no provider is reachable)
 * are simply absent from the returned map, signalling callers to fall back to
 * lexical similarity. Prefers OpenAI batch; otherwise local Ollama per-text.
 */
export async function embedTexts(texts: string[]): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  const unique = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)));
  if (unique.length === 0) return result;

  const misses: string[] = [];
  for (const t of unique) {
    const hit = cacheGet(t);
    if (hit) result.set(t, hit);
    else misses.push(t);
  }
  if (misses.length === 0) return result;

  // 1) OpenAI batch — single round-trip for all misses.
  const openaiVecs = await openaiEmbedBatch(misses);
  if (openaiVecs) {
    misses.forEach((t, i) => {
      const v = openaiVecs[i];
      if (Array.isArray(v)) {
        cacheSet(t, v);
        result.set(t, v);
      }
    });
    return result;
  }

  // 2) Ollama fallback — bounded concurrency so a local model isn't hammered.
  const CONCURRENCY = 4;
  for (let i = 0; i < misses.length; i += CONCURRENCY) {
    const batch = misses.slice(i, i + CONCURRENCY);
    const vecs = await Promise.all(batch.map(ollamaEmbedOne));
    batch.forEach((t, j) => {
      const v = vecs[j];
      if (Array.isArray(v)) {
        cacheSet(t, v);
        result.set(t, v);
      }
    });
    // If the first Ollama batch yields nothing, the embed model isn't available —
    // stop early and let callers fall back to lexical similarity.
    if (i === 0 && vecs.every((v) => v === null)) break;
  }

  return result;
}
