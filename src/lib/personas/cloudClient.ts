/**
 * HTTP client for the DAC Cloud orchestrator.
 * Used when EXECUTION_MODE=cloud to delegate persona execution to the cloud.
 */

interface OrchestratorStatus {
  workers: { total: number; idle: number; executing: number };
  queueLength: number;
  hasClaudeToken: boolean;
  oauth: { connected: boolean; scopes: string[]; expiresAt: string | null };
}

interface CloudExecution {
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  outputLines: number;
  output: string[];
  durationMs?: number;
  sessionId?: string;
  totalCostUsd?: number;
}

function getConfig() {
  return {
    orchestratorUrl: process.env.CLOUD_ORCHESTRATOR_URL || '',
    apiKey: process.env.CLOUD_API_KEY || '',
    executionMode: (process.env.EXECUTION_MODE || 'local') as 'local' | 'cloud',
  };
}

export function isCloudMode(): boolean {
  return getConfig().executionMode === 'cloud';
}

export function isCloudConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.orchestratorUrl && cfg.apiKey);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cfg = getConfig();
  if (!cfg.orchestratorUrl || !cfg.apiKey) {
    throw new Error('Cloud orchestrator not configured (CLOUD_ORCHESTRATOR_URL / CLOUD_API_KEY)');
  }

  const url = `${cfg.orchestratorUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Orchestrator ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const cloudClient = {
  async getStatus(): Promise<OrchestratorStatus> {
    return request<OrchestratorStatus>('/api/status');
  },

  async submitExecution(
    prompt: string,
    personaId: string,
    timeoutMs: number = 300_000,
  ): Promise<{ executionId: string; status: string }> {
    return request('/api/execute', {
      method: 'POST',
      body: JSON.stringify({ prompt, personaId, timeoutMs }),
    });
  },

  async getExecution(executionId: string, offset: number = 0): Promise<CloudExecution> {
    return request<CloudExecution>(`/api/executions/${executionId}?offset=${offset}`);
  },

  async cancelExecution(executionId: string): Promise<void> {
    await request(`/api/executions/${executionId}/cancel`, { method: 'POST' });
  },
};
