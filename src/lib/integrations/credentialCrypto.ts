/**
 * Credential Encryption for Persona Agent System
 *
 * AES-256-CBC encryption using a machine-derived key.
 * Localhost-only adequate security - keys derived from hostname + username + salt.
 */

import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT = 'vibeman-persona-credentials-v1';

/**
 * Derive an encryption key from machine-specific properties.
 * This ensures credentials are tied to the local machine.
 */
function deriveKey(): Buffer {
  const material = `${os.hostname()}:${os.userInfo().username}:${SALT}`;
  return crypto.pbkdf2Sync(material, SALT, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt credential data (JSON string).
 * Returns encrypted hex string and IV hex string.
 */
export function encryptCredential(data: string): { encrypted: string; iv: string } {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt credential data from encrypted hex string + IV hex string.
 * Returns the original JSON string.
 */
export function decryptCredential(encrypted: string, iv: string): string {
  const key = deriveKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a string into a single combined token: "enc:<iv_hex>:<ciphertext_hex>"
 * Useful for columns that store encrypted data in a single field.
 */
export function encryptField(data: string): string {
  const { encrypted, iv } = encryptCredential(data);
  return `enc:${iv}:${encrypted}`;
}

/**
 * Decrypt a combined "enc:<iv_hex>:<ciphertext_hex>" token back to plaintext.
 * Returns null if the input is not in encrypted format (backward compatible).
 */
export function decryptField(value: string): string | null {
  if (!value.startsWith('enc:')) return null;
  const parts = value.split(':');
  if (parts.length < 3) return null;
  const iv = parts[1];
  const encrypted = parts.slice(2).join(':');
  return decryptCredential(encrypted, iv);
}

/**
 * Check if a value is in encrypted field format.
 */
export function isEncryptedField(value: string | null): boolean {
  return value != null && value.startsWith('enc:');
}

/**
 * Decrypt a field, falling back to the raw value for unencrypted legacy data.
 */
export function decryptFieldOrRaw(value: string): string {
  if (value.startsWith('enc:')) {
    const decrypted = decryptField(value);
    if (decrypted !== null) return decrypted;
  }
  return value;
}

/**
 * Write credential data to a temporary file for tool script consumption.
 * Returns the temp file path. Caller MUST delete this file after use.
 */
export function writeTempCredentialFile(credentialData: string): string {
  const tmpDir = os.tmpdir();
  const fileName = `persona-cred-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
  const filePath = path.join(tmpDir, fileName);

  fs.writeFileSync(filePath, credentialData, { mode: 0o600 });
  return filePath;
}

/**
 * Delete a temporary credential file. Safe to call even if file doesn't exist.
 */
export function deleteTempCredentialFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best effort cleanup
  }
}
