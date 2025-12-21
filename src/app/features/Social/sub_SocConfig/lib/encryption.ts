/**
 * Simple encryption for API credentials stored in SQLite
 *
 * Note: This provides obfuscation rather than military-grade encryption.
 * The database file is gitignored and never committed, so the main goal
 * is to prevent casual reading of credentials if someone accesses the file.
 */

import crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive a key from project ID and a secret
function deriveKey(projectId: string): Buffer {
  // Use project ID + a fixed secret as the base for key derivation
  // In production, you might want to use environment variables for the secret
  const secret = process.env.SOCIAL_ENCRYPTION_SECRET || 'vibeman-social-config-2024';
  const salt = crypto.createHash('sha256').update(projectId).digest();

  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt credentials JSON string
 */
export function encryptCredentials(credentials: object, projectId: string): string {
  const key = deriveKey(projectId);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(credentials);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt credentials JSON string
 */
export function decryptCredentials<T = object>(encryptedData: string, projectId: string): T {
  const key = deriveKey(projectId);
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract IV, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as T;
}

/**
 * Mask sensitive values for display (e.g., API keys)
 * Shows first 4 and last 4 characters
 */
export function maskSecret(value: string): string {
  if (!value || value.length <= 8) {
    return '••••••••';
  }
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

/**
 * Validate that a string looks like an API key/token
 * Basic validation - not channel-specific
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  // Most API tokens are at least 20 characters
  if (token.length < 20) return false;

  // Check for alphanumeric + common token characters
  const validPattern = /^[A-Za-z0-9_\-.:]+$/;
  return validPattern.test(token);
}
