/**
 * Google OAuth 2.0 Flow for localhost applications.
 *
 * Uses the Desktop App OAuth pattern:
 *  1. Spin up a temporary HTTP server on a random port
 *  2. Open Google's consent screen in the user's browser
 *  3. Google redirects back to http://127.0.0.1:{port}
 *  4. Exchange the auth code for access + refresh tokens
 *
 * No redirect URI registration needed when using Desktop App client type.
 */

import http from 'http';
import { URL } from 'url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OAuthSession {
  id: string;
  port: number;
  status: 'pending' | 'success' | 'error';
  tokens?: OAuthTokens;
  error?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Session store (module-level, survives across API calls)
// ---------------------------------------------------------------------------

const sessions = new Map<string, OAuthSession & { server?: http.Server }>();

// Cleanup sessions older than 10 minutes
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      if (session.server) {
        try { session.server.close(); } catch { /* ignore */ }
      }
      sessions.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Google OAuth scopes by service
// ---------------------------------------------------------------------------

export const GOOGLE_SCOPES: Record<string, string[]> = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  google_calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  google_drive: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
  ],
};

/** Connectors that support the Google OAuth flow */
export const GOOGLE_OAUTH_CONNECTORS = new Set(['gmail', 'google_calendar', 'google_drive']);

export function isGoogleOAuthConnector(connectorName: string): boolean {
  return GOOGLE_OAUTH_CONNECTORS.has(connectorName);
}

// ---------------------------------------------------------------------------
// Start OAuth Flow
// ---------------------------------------------------------------------------

export function startOAuthFlow(
  clientId: string,
  clientSecret: string,
  connectorName: string,
  extraScopes?: string[]
): Promise<{ authUrl: string; sessionId: string }> {
  cleanupSessions();

  return new Promise((resolve, reject) => {
    const sessionId = `goauth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1`);

      // Handle the OAuth callback
      if (url.pathname === '/' || url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
          const session = sessions.get(sessionId);
          if (session) {
            session.status = 'error';
            session.error = `Google OAuth error: ${errorParam}`;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(buildResultPage(false, `Authorization denied: ${errorParam}`));
          shutdownServer(sessionId);
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(buildResultPage(false, 'No authorization code received'));
          return;
        }

        // Exchange code for tokens
        try {
          const session = sessions.get(sessionId)!;
          const tokens = await exchangeCodeForTokens(
            code,
            clientId,
            clientSecret,
            `http://127.0.0.1:${session.port}`
          );
          session.status = 'success';
          session.tokens = tokens;

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(buildResultPage(true, 'Authorization successful! You can close this tab.'));
        } catch (err) {
          const session = sessions.get(sessionId);
          if (session) {
            session.status = 'error';
            session.error = err instanceof Error ? err.message : 'Token exchange failed';
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(buildResultPage(false, `Token exchange failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }

        shutdownServer(sessionId);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    // Listen on a random port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to start OAuth callback server'));
        return;
      }

      const port = addr.port;

      // Build scopes
      const scopes = [
        ...(GOOGLE_SCOPES[connectorName] || []),
        ...(extraScopes || []),
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
      ];
      const uniqueScopes = [...new Set(scopes)];

      // Register session
      sessions.set(sessionId, {
        id: sessionId,
        port,
        status: 'pending',
        createdAt: Date.now(),
        server,
      });

      // Build Google OAuth URL
      const authUrl = buildAuthUrl(clientId, port, uniqueScopes);

      resolve({ authUrl, sessionId });
    });

    server.on('error', (err) => {
      reject(new Error(`OAuth server failed: ${err.message}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Get OAuth Flow Status
// ---------------------------------------------------------------------------

export function getOAuthStatus(sessionId: string): {
  status: 'pending' | 'success' | 'error' | 'not_found';
  tokens?: OAuthTokens;
  error?: string;
} {
  const session = sessions.get(sessionId);
  if (!session) return { status: 'not_found' };

  return {
    status: session.status,
    tokens: session.tokens,
    error: session.error,
  };
}

// ---------------------------------------------------------------------------
// Refresh Access Token
// ---------------------------------------------------------------------------

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthUrl(clientId: string, port: number, scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://127.0.0.1:${port}`,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.refresh_token) {
    throw new Error('No refresh token returned. Try revoking app access at https://myaccount.google.com/permissions and re-authorizing.');
  }

  return data as OAuthTokens;
}

function shutdownServer(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session?.server) {
    setTimeout(() => {
      try { session.server?.close(); } catch { /* ignore */ }
      session.server = undefined;
    }, 1000);
  }
}

function buildResultPage(success: boolean, message: string): string {
  const color = success ? '#10b981' : '#ef4444';
  const icon = success ? '&#10003;' : '&#10007;';
  return `<!DOCTYPE html>
<html>
<head><title>Google Authorization</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5;">
  <div style="text-align:center;max-width:400px;">
    <div style="font-size:48px;color:${color};margin-bottom:16px;">${icon}</div>
    <p style="font-size:16px;line-height:1.5;">${message}</p>
    <p style="font-size:13px;color:#666;margin-top:12px;">You can close this tab and return to Vibeman.</p>
  </div>
</body>
</html>`;
}
