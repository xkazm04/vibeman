/**
 * Server-side client for the `vibeman-optimize` Rust binary.
 *
 * Resolves the compiled binary, pipes a JSON request to its stdin, and parses
 * the JSON response from stdout. The binary owns the per-project CCR cache
 * (`<project_path>/.vibeman/optimizer-cache.db`), so this client is stateless.
 *
 * Resolution order: VIBEMAN_OPTIMIZE_BIN env → src-tauri/target/{release,debug}.
 * The Next.js server's cwd is the vibeman repo root, so the target/ fallbacks
 * work in dev without any extra wiring.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

export interface OptimizeResult {
  ok: boolean;
  error?: string;
  kind: string;
  /** Compressed text (compress kinds). Includes a retrieval marker when shrunk. */
  compressed?: string;
  /** Original content (retrieve kind). */
  content?: string;
  original_hash?: string;
  original_tokens: number;
  compressed_tokens: number;
  saved_tokens: number;
  strategy: string;
  cache_hit: boolean;
}

const OPTIMIZE_TIMEOUT_MS = 30_000;

function binName(): string {
  return process.platform === 'win32' ? 'vibeman-optimize.exe' : 'vibeman-optimize';
}

/** Resolve the vibeman-optimize binary path, or null if it can't be found. */
export function resolveOptimizeBin(): string | null {
  const envPath = process.env.VIBEMAN_OPTIMIZE_BIN;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }
  const name = binName();
  const candidates = [
    path.join(process.cwd(), 'src-tauri', 'target', 'release', name),
    path.join(process.cwd(), 'src-tauri', 'target', 'debug', name),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      return c;
    }
  }
  return null;
}

function failure(msg: string): OptimizeResult {
  return {
    ok: false,
    error: msg,
    kind: 'error',
    original_tokens: 0,
    compressed_tokens: 0,
    saved_tokens: 0,
    strategy: 'error',
    cache_hit: false,
  };
}

/** Invoke the optimizer. Never throws — returns `{ ok: false, error }` on any failure. */
export async function runOptimize(request: Record<string, unknown>): Promise<OptimizeResult> {
  const bin = resolveOptimizeBin();
  if (!bin) {
    return failure('vibeman-optimize binary not found (build src-tauri or set VIBEMAN_OPTIMIZE_BIN)');
  }

  return new Promise<OptimizeResult>((resolve) => {
    let settled = false;
    const done = (r: OptimizeResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    let child;
    try {
      child = spawn(bin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      return done(failure(`spawn failed: ${e instanceof Error ? e.message : String(e)}`));
    }

    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      done(failure('optimizer timed out'));
    }, OPTIMIZE_TIMEOUT_MS);

    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      done(failure(`spawn error: ${e.message}`));
    });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        done(JSON.parse(out.trim()) as OptimizeResult);
      } catch {
        done(failure(`bad optimizer output: ${(err || out).slice(0, 300)}`));
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}
