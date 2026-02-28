/**
 * CLI Execution Integration Tests
 *
 * Tests the full execution pipeline: API POST → SSE stream → result/error events.
 * Replicates the exact flow CompactTerminal.executeTask uses.
 *
 * Run: npx tsx tests/cli-execution.test.ts
 */

const BASE_URL = 'http://localhost:3000';
const PROJECT_PATH = 'C:/Users/kazim/dac/vibeman';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
}

const results: TestResult[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────

async function startExecution(
  prompt: string,
  provider: string = 'claude',
  model?: string
): Promise<{ success: boolean; executionId?: string; streamUrl?: string; error?: string }> {
  const body: Record<string, unknown> = {
    projectPath: PROJECT_PATH,
    prompt,
    provider,
  };
  if (model) body.model = model;

  const response = await fetch(`${BASE_URL}/api/claude-terminal/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    return { success: false, error: err.error || `HTTP ${response.status}` };
  }

  const data = await response.json();
  return {
    success: true,
    executionId: data.executionId,
    streamUrl: data.streamUrl,
  };
}

async function collectSSEEvents(
  streamUrl: string,
  timeoutMs: number = 30000
): Promise<{ events: Array<{ type: string; data: any }>; error?: string }> {
  const events: Array<{ type: string; data: any }> = [];

  return new Promise((resolve) => {
    const fullUrl = `${BASE_URL}${streamUrl}`;
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ events, error: 'Timeout waiting for terminal event' });
      }
    }, timeoutMs);

    // Use fetch + streaming instead of EventSource (not available in Node)
    fetch(fullUrl).then(async (response) => {
      if (!response.ok || !response.body) {
        clearTimeout(timeout);
        settled = true;
        resolve({ events, error: `Stream HTTP ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (!settled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                events.push({ type: data.type, data });

                // Terminal events
                if (data.type === 'result' || data.type === 'error') {
                  clearTimeout(timeout);
                  if (!settled) {
                    settled = true;
                    reader.cancel();
                    resolve({ events });
                  }
                  return;
                }
              } catch { /* parse error */ }
            }
          }
        }
      } catch (e) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({ events, error: e instanceof Error ? e.message : 'Stream read error' });
        }
      }
    }).catch((e) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ events, error: e instanceof Error ? e.message : 'Fetch failed' });
      }
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

async function testClaudeSimplePrompt() {
  const name = 'Claude: simple prompt (say hello)';
  const start = Date.now();

  try {
    const exec = await startExecution('Say hello and nothing else', 'claude');
    if (!exec.success) {
      results.push({ name, passed: false, duration: Date.now() - start, details: `Start failed: ${exec.error}` });
      return;
    }

    const stream = await collectSSEEvents(exec.streamUrl!, 20000);

    const hasConnected = stream.events.some(e => e.type === 'connected');
    const hasResult = stream.events.some(e => e.type === 'result');
    const hasError = stream.events.some(e => e.type === 'error');
    const hasMessage = stream.events.some(e => e.type === 'message');
    const resultEvent = stream.events.find(e => e.type === 'result');
    const isError = resultEvent?.data?.data?.isError;

    const passed = hasConnected && hasResult && hasMessage && !isError;
    const details = [
      `Events: ${stream.events.map(e => e.type).join(', ')}`,
      `Connected: ${hasConnected}, Message: ${hasMessage}, Result: ${hasResult}, Error: ${hasError}`,
      isError ? `Result.isError: true` : '',
      stream.error ? `Stream error: ${stream.error}` : '',
    ].filter(Boolean).join(' | ');

    results.push({ name, passed, duration: Date.now() - start, details });
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, details: `Exception: ${e}` });
  }
}

async function testClaudeRequirementPrompt() {
  const name = 'Claude: requirement file prompt';
  const start = Date.now();

  try {
    // This replicates what CompactTerminal.executeTask does
    const prompt = 'Execute the requirement file: idea-0309983d-replace-template-string-replac';
    const exec = await startExecution(prompt, 'claude');
    if (!exec.success) {
      results.push({ name, passed: false, duration: Date.now() - start, details: `Start failed: ${exec.error}` });
      return;
    }

    // Only check that execution starts and we get connected + first events
    const stream = await collectSSEEvents(exec.streamUrl!, 15000);

    const hasConnected = stream.events.some(e => e.type === 'connected');
    // Don't wait for completion - just verify it starts correctly
    const hasAnyEvent = stream.events.length >= 2; // connected + at least one more

    const passed = hasConnected && hasAnyEvent;
    const details = [
      `Events (${stream.events.length}): ${stream.events.map(e => e.type).join(', ')}`,
      stream.error ? `Stream error: ${stream.error}` : '',
    ].filter(Boolean).join(' | ');

    results.push({ name, passed, duration: Date.now() - start, details });

    // Abort the execution so it doesn't run forever
    if (exec.executionId) {
      await fetch(`${BASE_URL}/api/claude-terminal/query?executionId=${exec.executionId}`, { method: 'DELETE' });
    }
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, details: `Exception: ${e}` });
  }
}

async function testGeminiSpawnQuoting() {
  const name = 'Gemini: multi-word prompt (spawn quoting fix)';
  const start = Date.now();

  try {
    const exec = await startExecution('Say hello and nothing else', 'gemini');
    if (!exec.success) {
      results.push({ name, passed: false, duration: Date.now() - start, details: `Start failed: ${exec.error}` });
      return;
    }

    const stream = await collectSSEEvents(exec.streamUrl!, 20000);

    const hasConnected = stream.events.some(e => e.type === 'connected');
    // Gemini may fail with API key error, but should NOT fail with
    // "Cannot use both a positional prompt and the --prompt (-p) flag together"
    const errorEvent = stream.events.find(e => e.type === 'error');
    const errorMsg = errorEvent?.data?.data?.error || errorEvent?.data?.data?.message || '';
    const isSpawnError = errorMsg.includes('positional prompt') || errorMsg.includes('Cannot use both');
    const isQuickExit = errorMsg.includes('failed to start') || errorMsg.includes('CLI not found');

    // Pass if init was received OR if the error is about API key (not spawn quoting)
    const hasInit = stream.events.some(e => {
      const d = e.data;
      return e.type === 'connected' && d?.data?.session_id;
    });
    const resultEvent = stream.events.find(e => e.type === 'result');
    const resultData = resultEvent?.data;

    const passed = hasConnected && !isSpawnError && !isQuickExit;
    const details = [
      `Events: ${stream.events.map(e => e.type).join(', ')}`,
      errorMsg ? `Error: ${errorMsg.slice(0, 120)}` : '',
      `Spawn quoting issue: ${isSpawnError ? 'YES (BUG!)' : 'No (fixed)'}`,
      stream.error ? `Stream error: ${stream.error}` : '',
    ].filter(Boolean).join(' | ');

    results.push({ name, passed, duration: Date.now() - start, details });
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, details: `Exception: ${e}` });
  }
}

async function testGeminiModelParam() {
  const name = 'Gemini: model parameter passed correctly';
  const start = Date.now();

  try {
    const exec = await startExecution('Say hello', 'gemini', 'gemini-3.1-pro-preview');
    if (!exec.success) {
      results.push({ name, passed: false, duration: Date.now() - start, details: `Start failed: ${exec.error}` });
      return;
    }

    const stream = await collectSSEEvents(exec.streamUrl!, 15000);
    const hasConnected = stream.events.some(e => e.type === 'connected');

    // Check that CLI didn't fail due to spawn/args issue
    const errorEvent = stream.events.find(e => e.type === 'error');
    const errorMsg = errorEvent?.data?.data?.error || errorEvent?.data?.data?.message || '';
    const isArgError = errorMsg.includes('positional') || errorMsg.includes('Cannot use both');

    const passed = hasConnected && !isArgError;
    const details = [
      `Events: ${stream.events.map(e => e.type).join(', ')}`,
      errorMsg ? `Error: ${errorMsg.slice(0, 120)}` : '',
    ].filter(Boolean).join(' | ');

    results.push({ name, passed, duration: Date.now() - start, details });
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, details: `Exception: ${e}` });
  }
}

async function testAPIRouteExists() {
  const name = 'API: /api/ideas/update-implementation-status exists';
  const start = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/ideas/update-implementation-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementName: '__test_nonexistent__' }),
    });

    // Should get a JSON response (404 = not found idea, but route exists)
    const data = await response.json();
    const isRouteFound = response.status !== 404 || (data.error?.code === 'REQUIREMENT_NOT_FOUND');
    const passed = isRouteFound;
    const details = `Status: ${response.status}, Response: ${JSON.stringify(data).slice(0, 100)}`;

    results.push({ name, passed, duration: Date.now() - start, details });
  } catch (e) {
    results.push({ name, passed: false, duration: Date.now() - start, details: `Exception: ${e}` });
  }
}

// ─── Runner ───────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== CLI Execution Integration Tests ===\n');

  // Check server is running
  try {
    const resp = await fetch(`${BASE_URL}/api/projects`);
    if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
  } catch (e) {
    console.error(`Server not running at ${BASE_URL}. Start with: npm run dev`);
    process.exit(1);
  }

  // Run tests sequentially (to avoid overwhelming the server)
  await testAPIRouteExists();
  await testClaudeSimplePrompt();
  await testClaudeRequirementPrompt();
  await testGeminiSpawnQuoting();
  await testGeminiModelParam();

  // Print results
  console.log('\n─── Results ───\n');
  let passed = 0, failed = 0;
  for (const r of results) {
    const status = r.passed ? '✓' : '✗';
    const color = r.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${r.name} (${r.duration}ms)`);
    if (!r.passed || r.details) {
      console.log(`  ${r.details}`);
    }
    if (r.passed) passed++; else failed++;
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
