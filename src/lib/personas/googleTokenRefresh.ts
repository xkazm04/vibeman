/**
 * Google Token Refresh Utility
 *
 * Provides credential validation and access-token refresh for Google OAuth
 * connectors (gmail, google_calendar, google_drive).
 *
 * Used by:
 *  - Healthcheck API route to validate credentials from the UI
 *  - Execution engine to pre-validate Google creds before spawning Claude CLI
 *  - Any future tool that needs a fresh access token without googleapis
 */

import { refreshAccessToken, isGoogleOAuthConnector } from './googleOAuth';
import { decryptCredential, encryptCredential } from './credentialCrypto';
import { personaCredentialRepository } from '@/app/db/repositories/persona.repository';
import type { DbPersonaCredential } from '@/app/db/models/persona.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleCredentialData {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  access_token?: string;
  expires_in?: number;
  error?: string;
}

export interface HealthcheckResult {
  healthy: boolean;
  service_type: string;
  message: string;
  profile?: { email: string };
}

// ---------------------------------------------------------------------------
// Core: Ensure a fresh access token
// ---------------------------------------------------------------------------

/**
 * Get a fresh Google access token from stored credential data.
 * Always refreshes (Google access tokens expire after ~1 hour).
 */
export async function ensureFreshGoogleToken(
  credData: GoogleCredentialData
): Promise<TokenRefreshResult> {
  try {
    const result = await refreshAccessToken(
      credData.client_id,
      credData.client_secret,
      credData.refresh_token
    );
    return {
      success: true,
      access_token: result.access_token,
      expires_in: result.expires_in,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Token refresh failed',
    };
  }
}

// ---------------------------------------------------------------------------
// DB-level: Refresh token for a stored credential
// ---------------------------------------------------------------------------

/**
 * Given a credential ID, decrypt it, refresh the access token, and
 * optionally persist the new access_token back to the DB.
 */
export async function refreshStoredCredential(
  credentialId: string,
  persistToken = false
): Promise<TokenRefreshResult> {
  const cred = personaCredentialRepository.getById(credentialId);
  if (!cred) return { success: false, error: 'Credential not found' };

  if (!isGoogleOAuthConnector(cred.service_type)) {
    return { success: false, error: `Not a Google OAuth credential (type: ${cred.service_type})` };
  }

  let credData: GoogleCredentialData;
  try {
    const raw = decryptCredential(cred.encrypted_data, cred.iv);
    credData = JSON.parse(raw);
  } catch {
    return { success: false, error: 'Failed to decrypt credential' };
  }

  if (!credData.client_id || !credData.client_secret || !credData.refresh_token) {
    return { success: false, error: 'Credential missing required fields (client_id, client_secret, refresh_token)' };
  }

  const result = await ensureFreshGoogleToken(credData);

  if (result.success && persistToken && result.access_token) {
    try {
      credData.access_token = result.access_token;
      const { encrypted, iv } = encryptCredential(JSON.stringify(credData));
      personaCredentialRepository.update(credentialId, {
        encrypted_data: encrypted,
        iv,
      });
    } catch {
      // Non-fatal — token refresh still succeeded
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Healthcheck: Validate a Google credential by calling the userinfo endpoint
// ---------------------------------------------------------------------------

/**
 * Validate a Google credential by refreshing the token and calling
 * the Google userinfo endpoint. Returns the user's email on success.
 */
export async function healthcheckGoogleCredential(
  credential: DbPersonaCredential
): Promise<HealthcheckResult> {
  let credData: GoogleCredentialData;
  try {
    const raw = decryptCredential(credential.encrypted_data, credential.iv);
    credData = JSON.parse(raw);
  } catch {
    return { healthy: false, service_type: credential.service_type, message: 'Failed to decrypt credential data' };
  }

  // Refresh token first
  const tokenResult = await ensureFreshGoogleToken(credData);
  if (!tokenResult.success || !tokenResult.access_token) {
    return {
      healthy: false,
      service_type: credential.service_type,
      message: tokenResult.error || 'Token refresh failed',
    };
  }

  // Call Google userinfo to verify the token works
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenResult.access_token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        healthy: false,
        service_type: credential.service_type,
        message: `Google API returned ${response.status}: ${text}`,
      };
    }

    const profile = await response.json();
    return {
      healthy: true,
      service_type: credential.service_type,
      message: `Connected as ${profile.email}`,
      profile: { email: profile.email },
    };
  } catch (err) {
    return {
      healthy: false,
      service_type: credential.service_type,
      message: err instanceof Error ? err.message : 'Failed to verify token',
    };
  }
}

// ---------------------------------------------------------------------------
// Generic healthcheck dispatcher
// ---------------------------------------------------------------------------

/**
 * Run a healthcheck on any credential type.
 * Currently supports Google OAuth connectors; others return a basic result.
 */
export async function healthcheckCredential(
  credential: DbPersonaCredential
): Promise<HealthcheckResult> {
  if (isGoogleOAuthConnector(credential.service_type)) {
    return healthcheckGoogleCredential(credential);
  }

  // For non-Google credentials, return a basic "no healthcheck available" result
  return {
    healthy: true,
    service_type: credential.service_type,
    message: 'No automatic healthcheck available for this credential type',
  };
}
