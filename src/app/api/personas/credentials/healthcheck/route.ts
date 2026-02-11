import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { decryptCredential } from '@/lib/personas/credentialCrypto';
import { isGoogleOAuthConnector } from '@/lib/personas/googleOAuth';
import { healthcheckGoogleCredential } from '@/lib/personas/googleTokenRefresh';

const TIMEOUT_MS = 3000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkGithub(data: Record<string, unknown>): Promise<{ success: boolean; message: string; details?: unknown }> {
  const token = data.token as string | undefined;
  if (!token) {
    return { success: false, message: 'Missing required GitHub token' };
  }

  try {
    const response = await fetchWithTimeout('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Vibeman-Persona-Agent',
      },
    });

    if (response.ok) {
      const userData = await response.json() as Record<string, unknown>;
      return { success: true, message: `GitHub token valid - authenticated as ${userData.login}`, details: { login: userData.login } };
    }

    return { success: false, message: `GitHub authentication failed: ${response.statusText} (${response.status})` };
  } catch (err) {
    return { success: false, message: `GitHub healthcheck failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

async function checkSlack(data: Record<string, unknown>): Promise<{ success: boolean; message: string; details?: unknown }> {
  const botToken = data.bot_token as string | undefined;
  if (!botToken) {
    return { success: false, message: 'Missing required Slack bot_token' };
  }

  try {
    const response = await fetchWithTimeout('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json() as Record<string, unknown>;
    if (result.ok) {
      return { success: true, message: `Slack token valid - team: ${result.team}, user: ${result.user}`, details: { team: result.team, user: result.user } };
    }

    return { success: false, message: `Slack authentication failed: ${result.error}` };
  } catch (err) {
    return { success: false, message: `Slack healthcheck failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

async function checkHttp(data: Record<string, unknown>): Promise<{ success: boolean; message: string; details?: unknown }> {
  const baseUrl = data.base_url as string | undefined;
  if (!baseUrl) {
    return { success: false, message: 'Missing required base_url' };
  }

  try {
    const headers: Record<string, string> = {};
    if (data.api_key) {
      headers['Authorization'] = `Bearer ${data.api_key}`;
    }
    if (data.headers && typeof data.headers === 'string') {
      try {
        Object.assign(headers, JSON.parse(data.headers));
      } catch {
        // ignore invalid header JSON
      }
    }

    const response = await fetchWithTimeout(baseUrl, { headers });
    return { success: response.ok, message: response.ok ? `HTTP endpoint reachable (${response.status})` : `HTTP endpoint returned ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { success: false, message: `HTTP healthcheck failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential_id } = body;

    if (!credential_id) {
      return NextResponse.json(
        { error: 'Missing required field: credential_id' },
        { status: 400 }
      );
    }

    // Look up credential
    const credential = personaDb.credentials.getById(credential_id);
    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Decrypt credential data
    let data: Record<string, unknown>;
    try {
      const decrypted = decryptCredential(credential.encrypted_data, credential.iv);
      data = JSON.parse(decrypted);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: 'Failed to decrypt credential data' },
        { status: 500 }
      );
    }

    // Perform service-specific healthcheck
    let result: { success: boolean; message: string; details?: unknown };

    if (isGoogleOAuthConnector(credential.service_type)) {
      // Use shared Google healthcheck (supports gmail, google_calendar, google_drive)
      const hc = await healthcheckGoogleCredential(credential);
      result = { success: hc.healthy, message: hc.message, details: hc.profile };
    } else {
      switch (credential.service_type) {
        case 'github':
          result = await checkGithub(data);
          break;
        case 'slack':
          result = await checkSlack(data);
          break;
        case 'http':
          result = await checkHttp(data);
          break;
        case 'custom':
          result = { success: true, message: 'Custom credentials - no automatic healthcheck available' };
          break;
        default:
          result = { success: false, message: `Unknown service type: ${credential.service_type}` };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error performing healthcheck:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Healthcheck failed' },
      { status: 500 }
    );
  }
}
