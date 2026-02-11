/**
 * Connector Discovery Engine
 *
 * Spawns Claude Code CLI to research a service's API and generate
 * a complete connector definition (auth fields, events, icon, etc.).
 *
 * Follows the same buffer/streaming pattern as designEngine.ts.
 */

import type { CredentialTemplateField, CredentialTemplateEvent } from './credentialTemplates';

// ============================================================================
// Types
// ============================================================================

export interface ConnectorDiscoveryResult {
  connector: {
    name: string;
    label: string;
    icon_url: string | null;
    color: string;
    category: string;
    fields: CredentialTemplateField[];
    healthcheck_config: { description: string; endpoint?: string; method?: string };
    services: { toolName: string; label: string }[];
    events: CredentialTemplateEvent[];
  };
  summary: string;
  setup_instructions: string;
}

interface DiscoveryStatus {
  done: boolean;
  result: ConnectorDiscoveryResult | null;
  error: string | null;
}

// ============================================================================
// In-memory state for streaming
// ============================================================================

const discoveryBuffers = new Map<string, string[]>();
const discoveryStatuses = new Map<string, DiscoveryStatus>();

export function consumeDiscoveryOutput(discoveryId: string, offset: number = 0): string[] {
  const buffer = discoveryBuffers.get(discoveryId);
  if (!buffer) return [];
  return buffer.slice(offset);
}

export function getDiscoveryBufferLength(discoveryId: string): number {
  return discoveryBuffers.get(discoveryId)?.length ?? 0;
}

export function getDiscoveryStatus(discoveryId: string): DiscoveryStatus | null {
  return discoveryStatuses.get(discoveryId) ?? null;
}

export function cleanupDiscovery(discoveryId: string): void {
  discoveryBuffers.delete(discoveryId);
  discoveryStatuses.delete(discoveryId);
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildDiscoveryPrompt(serviceName: string, context?: string): string {
  const parts: string[] = [];

  parts.push('You are a connector configuration expert. Your task is to research a service and generate a complete connector definition for integrating with it.');
  parts.push('');
  parts.push(`# Service to Research: ${serviceName}`);
  if (context) {
    parts.push(`# Additional Context: ${context}`);
  }
  parts.push('');

  parts.push('# Tasks');
  parts.push('1. Determine the authentication method (API key, OAuth, token, etc.)');
  parts.push('2. Identify the required credential fields');
  parts.push('3. Find the appropriate Simple Icons slug for the brand icon');
  parts.push('   - Icon URL format: https://cdn.simpleicons.org/{slug}/{hex_without_hash}');
  parts.push('   - Example: https://cdn.simpleicons.org/discord/5865F2');
  parts.push('   - If no icon exists, set icon_url to null');
  parts.push('4. Determine the brand color (hex)');
  parts.push('5. Suggest common API operations (services/tools)');
  parts.push('6. Suggest common event triggers (webhooks, polling)');
  parts.push('7. Write setup instructions for the user');
  parts.push('');

  parts.push('# Output Requirements');
  parts.push('Output a single valid JSON object. Do NOT wrap it in markdown code fences.');
  parts.push('The JSON must match this exact schema:');
  parts.push('');
  parts.push(`{
  "connector": {
    "name": "service_name_lowercase",
    "label": "Service Display Name",
    "icon_url": "https://cdn.simpleicons.org/{slug}/{hex}" or null,
    "color": "#HEX_COLOR",
    "category": "communication|development|productivity|analytics|storage|general",
    "fields": [
      {
        "key": "field_key",
        "label": "Field Label",
        "type": "text|password|textarea|url",
        "placeholder": "placeholder text",
        "helpText": "optional help text",
        "required": true
      }
    ],
    "healthcheck_config": {
      "description": "How to verify the credential works",
      "endpoint": "/api/endpoint-to-test",
      "method": "GET"
    },
    "services": [
      { "toolName": "service_action", "label": "Action Label" }
    ],
    "events": [
      {
        "id": "event_id",
        "name": "Event Name",
        "description": "When this event triggers",
        "defaultConfig": { "pollingIntervalSeconds": 60 }
      }
    ]
  },
  "summary": "One-line summary of what this connector does",
  "setup_instructions": "# Setup Instructions\\n\\nStep-by-step markdown guide..."
}`);
  parts.push('');
  parts.push('Output the JSON now:');

  return parts.join('\n');
}

// ============================================================================
// JSON Extraction
// ============================================================================

function extractDiscoveryResult(rawOutput: string): ConnectorDiscoveryResult | null {
  if (!rawOutput.trim()) return null;

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(rawOutput.trim());
    if (parsed.connector && parsed.summary) return parsed;
  } catch { /* continue */ }

  // Strategy 2: Extract from markdown code fence
  const fenceMatch = rawOutput.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed.connector && parsed.summary) return parsed;
    } catch { /* continue */ }
  }

  // Strategy 3: Find JSON object with connector key
  const startIdx = rawOutput.indexOf('{"connector"');
  if (startIdx >= 0) {
    let depth = 0;
    for (let i = startIdx; i < rawOutput.length; i++) {
      if (rawOutput[i] === '{') depth++;
      if (rawOutput[i] === '}') depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(rawOutput.slice(startIdx, i + 1));
          if (parsed.connector && parsed.summary) return parsed;
        } catch { /* continue */ }
        break;
      }
    }
  }

  // Strategy 4: First { to last }
  const braceStart = rawOutput.indexOf('{');
  const braceEnd = rawOutput.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    try {
      const parsed = JSON.parse(rawOutput.slice(braceStart, braceEnd + 1));
      if (parsed.connector) return parsed;
    } catch { /* continue */ }
  }

  return null;
}

// ============================================================================
// Assistant text extraction (same pattern as designEngine)
// ============================================================================

function extractAssistantText(rawOutput: string): string {
  const textParts: string[] = [];

  for (const line of rawOutput.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          }
        }
      }
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        textParts.push(parsed.delta.text);
      }
      if (parsed.type === 'result' && parsed.result?.text) {
        textParts.push(parsed.result.text);
      }
    } catch {
      if (line.trim().startsWith('{') || line.trim().startsWith('"')) {
        textParts.push(line.trim());
      }
    }
  }

  return textParts.length > 0 ? textParts.join('') : rawOutput;
}

// ============================================================================
// Main Engine
// ============================================================================

export interface ConnectorDiscoveryInput {
  discoveryId: string;
  serviceName: string;
  context?: string;
}

export function runConnectorDiscovery(input: ConnectorDiscoveryInput): void {
  const { spawn } = require('child_process');

  discoveryBuffers.set(input.discoveryId, []);
  discoveryStatuses.set(input.discoveryId, { done: false, result: null, error: null });

  const appendOutput = (line: string) => {
    const buffer = discoveryBuffers.get(input.discoveryId);
    if (buffer) buffer.push(line);
  };

  const setStatus = (done: boolean, result: ConnectorDiscoveryResult | null, error: string | null) => {
    discoveryStatuses.set(input.discoveryId, { done, result, error });
  };

  const prompt = buildDiscoveryPrompt(input.serviceName, input.context);

  appendOutput(`[Discovery] Researching: "${input.serviceName}"`);
  appendOutput(`[Discovery] Prompt length: ${prompt.length} chars`);
  appendOutput('');

  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'claude.cmd' : 'claude';
    const args = ['-p', '-', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env,
    });

    childProcess.stdin.write(prompt);
    childProcess.stdin.end();

    let fullOutput = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;

      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                appendOutput(block.text.slice(0, 200));
              }
            }
          } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            appendOutput(parsed.delta.text.slice(0, 200));
          }
        } catch {
          if (line.trim().length > 0 && line.trim().length < 300) {
            appendOutput(line.trim());
          }
        }
      }
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) appendOutput(`[stderr] ${text}`);
    });

    childProcess.on('close', (code: number) => {
      appendOutput('');
      appendOutput(`[Discovery] Process exited with code: ${code}`);

      if (code === 0) {
        const assistantText = extractAssistantText(fullOutput);
        const result = extractDiscoveryResult(assistantText);

        if (result) {
          appendOutput('[Discovery] Successfully parsed connector definition');
          appendOutput(`[Discovery] Connector: ${result.connector.label}`);
          appendOutput(`[Discovery] Fields: ${result.connector.fields.length}`);
          appendOutput(`[Discovery] Services: ${result.connector.services.length}`);
          appendOutput(`[Discovery] Events: ${result.connector.events.length}`);
          setStatus(true, result, null);
        } else {
          appendOutput('[Discovery] Warning: Could not parse JSON from output');
          setStatus(true, null, 'Failed to parse connector definition from Claude output');
        }
      } else {
        appendOutput(`[Discovery] Failed with exit code ${code}`);
        setStatus(true, null, `Discovery failed (exit code ${code})`);
      }

      setTimeout(() => cleanupDiscovery(input.discoveryId), 5 * 60 * 1000);
    });

    childProcess.on('error', (err: Error) => {
      if (err.message.includes('ENOENT') || err.message.includes('spawn claude')) {
        appendOutput('[Discovery] Claude CLI not found — returning simulation result');

        const simResult: ConnectorDiscoveryResult = {
          connector: {
            name: input.serviceName.toLowerCase().replace(/\s+/g, '_'),
            label: input.serviceName,
            icon_url: null,
            color: '#6B7280',
            category: 'general',
            fields: [
              { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key', required: true },
            ],
            healthcheck_config: { description: `Verify ${input.serviceName} API key` },
            services: [],
            events: [],
          },
          summary: `[Simulated] Connector for ${input.serviceName}`,
          setup_instructions: `# ${input.serviceName} Setup\n\n*Simulated — install Claude CLI for real discovery*`,
        };

        setStatus(true, simResult, null);
      } else {
        appendOutput(`[Discovery] Error: ${err.message}`);
        setStatus(true, null, `Spawn error: ${err.message}`);
      }

      setTimeout(() => cleanupDiscovery(input.discoveryId), 5 * 60 * 1000);
    });

    const timeout = setTimeout(() => {
      if (!childProcess.killed) {
        appendOutput('[Discovery] Timeout reached (5 min), killing process');
        childProcess.kill();
      }
    }, 5 * 60 * 1000);

    childProcess.on('close', () => clearTimeout(timeout));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    appendOutput(`[Discovery] Exception: ${msg}`);
    setStatus(true, null, `Exception: ${msg}`);
    setTimeout(() => cleanupDiscovery(input.discoveryId), 5 * 60 * 1000);
  }
}
