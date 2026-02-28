/**
 * HTTP Server for Vibeman Bridge
 *
 * Runs on localhost:9876 with CORS support for the Vibeman Next.js app.
 * Provides endpoints for task execution, SSE streaming, and health checks.
 */

import * as http from 'http';
import * as url from 'url';
import { ExecutionManager } from './executionManager';
import type { ExecuteTaskRequest, HealthResponse, BridgeEvent } from './types';

export class BridgeServer {
  private server: http.Server | null = null;
  private execManager = new ExecutionManager();

  constructor(private port: number) {}

  start(): void {
    if (this.server) return;

    this.server = http.createServer((req, res) => this.handleRequest(req, res));

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`[vibeman-bridge] Server running on http://127.0.0.1:${this.port}`);
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[vibeman-bridge] Port ${this.port} is already in use`);
      } else {
        console.error(`[vibeman-bridge] Server error:`, err);
      }
    });
  }

  stop(): void {
    this.execManager.cancelAll();
    this.server?.close();
    this.server = null;
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS for any localhost origin (Vibeman dev server)
    const origin = req.headers.origin;
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;

    try {
      if (pathname === '/health' && req.method === 'GET') {
        this.handleHealth(res);
      } else if (pathname === '/execute-task' && req.method === 'POST') {
        this.handleExecuteTask(req, res);
      } else if (pathname === '/execute-task' && req.method === 'DELETE') {
        this.handleCancel(res, parsedUrl.query as Record<string, string>);
      } else if (pathname === '/stream' && req.method === 'GET') {
        this.handleStream(req, res, parsedUrl.query as Record<string, string>);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
    }
  }

  private async handleHealth(res: http.ServerResponse): Promise<void> {
    const models = await this.execManager.getAvailableModels();
    const response: HealthResponse = {
      running: true,
      models,
      version: '0.1.0',
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private async handleExecuteTask(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    let parsed: ExecuteTaskRequest;

    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const { projectPath, prompt, model } = parsed;

    if (!projectPath || !prompt?.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'projectPath and prompt are required' }));
      return;
    }

    const executionId = this.execManager.startExecution(projectPath, prompt.trim(), model);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      executionId,
      streamUrl: `http://127.0.0.1:${this.port}/stream?executionId=${executionId}`,
    }));
  }

  private handleCancel(res: http.ServerResponse, query: Record<string, string>): void {
    const executionId = query.executionId;
    if (!executionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'executionId required' }));
      return;
    }

    const cancelled = this.execManager.cancel(executionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: cancelled }));
  }

  private handleStream(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: Record<string, string>
  ): void {
    const executionId = query.executionId;
    if (!executionId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('executionId required');
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Listener that writes SSE events
    const listener = (event: BridgeEvent) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Connection closed
      }
    };

    const success = this.execManager.subscribe(executionId, listener);
    if (!success) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: { error: 'Unknown execution' }, timestamp: Date.now() })}\n\n`);
      res.end();
      return;
    }

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', data: {}, timestamp: Date.now() })}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 15_000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      this.execManager.unsubscribe(executionId, listener);
    });
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
