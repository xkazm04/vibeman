/**
 * Token-optimization API.
 *
 * POST { kind, projectPath, ... } compresses file reads / search output / logs
 * through the `vibeman-optimize` binary, caching into the PROJECT'S OWN
 * `.vibeman/optimizer-cache.db` (per-project isolation — separate file per
 * project, so content never crosses projects). Backs the
 * vibeman_read / vibeman_search / vibeman_logs / vibeman_retrieve MCP tools.
 *
 * The route only does I/O the binary can't (reading a file, running ripgrep);
 * compression, hashing, and caching all happen in the binary.
 */

import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { validateProjectPath, validateFilePath } from '@/lib/pathSecurity';
import { runOptimize } from '@/lib/optimize/optimizeClient';

interface OptimizeBody {
  kind?: string;
  projectPath?: string;
  path?: string;
  query?: string;
  glob?: string;
  content?: string;
  hash?: string;
  options?: Record<string, unknown>;
}

/** Run ripgrep in the project, returning combined `file:line:content` output. */
async function runRipgrep(
  query: string,
  cwd: string,
  glob?: string
): Promise<{ ok: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const args = ['--line-number', '--no-heading', '--color', 'never', '--max-columns', '300'];
    if (glob) {
      args.push('-g', glob);
    }
    args.push('--', query);

    let child;
    try {
      child = spawn('rg', args, { cwd });
    } catch (e) {
      return resolve({ ok: false, error: `ripgrep unavailable: ${e instanceof Error ? e.message : String(e)}` });
    }

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', (e) => resolve({ ok: false, error: `ripgrep unavailable: ${e.message}` }));
    child.on('close', (code) => {
      // rg exit 1 means "no matches" — that's a valid empty result, not an error.
      if (code === 0 || code === 1) {
        resolve({ ok: true, output: out });
      } else {
        resolve({ ok: false, error: err || `ripgrep exited ${code}` });
      }
    });
  });
}

async function handlePost(request: NextRequest) {
  let body: OptimizeBody;
  try {
    body = (await request.json()) as OptimizeBody;
  } catch {
    return buildErrorResponse('Invalid JSON body', { status: 400 });
  }

  const kind = body.kind;
  const projectPath = body.projectPath;
  if (!kind) {
    return buildErrorResponse('kind is required', { status: 400 });
  }
  if (!projectPath) {
    return buildErrorResponse('projectPath is required', { status: 400 });
  }
  const projErr = validateProjectPath(projectPath);
  if (projErr) {
    return buildErrorResponse(projErr, { status: 400 });
  }

  const options = body.options && typeof body.options === 'object' ? body.options : {};

  if (kind === 'retrieve') {
    if (!body.hash) {
      return buildErrorResponse('hash is required for retrieve', { status: 400 });
    }
    const r = await runOptimize({ kind: 'retrieve', project_path: projectPath, hash: String(body.hash) });
    return buildSuccessResponse(r);
  }

  if (kind === 'read') {
    if (!body.path) {
      return buildErrorResponse('path is required for read', { status: 400 });
    }
    const v = validateFilePath(String(body.path), projectPath);
    if (!v.valid) {
      return buildErrorResponse(v.error, { status: 400 });
    }
    let content: string;
    try {
      content = await fs.readFile(v.resolvedPath, 'utf-8');
    } catch (e) {
      return buildErrorResponse(`read failed: ${e instanceof Error ? e.message : String(e)}`, { status: 404 });
    }
    const r = await runOptimize({
      kind: 'read',
      project_path: projectPath,
      path: String(body.path),
      content,
      options,
    });
    return buildSuccessResponse(r);
  }

  if (kind === 'logs') {
    if (typeof body.content !== 'string') {
      return buildErrorResponse('content is required for logs', { status: 400 });
    }
    const r = await runOptimize({ kind: 'logs', project_path: projectPath, content: body.content, options });
    return buildSuccessResponse(r);
  }

  if (kind === 'search') {
    let content: string | undefined = typeof body.content === 'string' ? body.content : undefined;
    if (content === undefined) {
      if (!body.query) {
        return buildErrorResponse('query or content is required for search', { status: 400 });
      }
      const rg = await runRipgrep(String(body.query), projectPath, body.glob ? String(body.glob) : undefined);
      if (!rg.ok) {
        return buildErrorResponse(rg.error || 'search failed', { status: 400 });
      }
      content = rg.output || '';
    }
    const r = await runOptimize({
      kind: 'search',
      project_path: projectPath,
      content,
      query: body.query ? String(body.query) : undefined,
      options,
    });
    return buildSuccessResponse(r);
  }

  return buildErrorResponse(`unknown kind: ${kind}`, { status: 400 });
}

export const POST = handlePost;
