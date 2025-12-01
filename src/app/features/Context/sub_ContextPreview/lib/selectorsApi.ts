/**
 * Test Selectors API functions
 */

import { TestSelector, ScanResult } from './types';

const REQUEST_TIMEOUT = 15000;

/**
 * Fetch selectors for a context
 */
export async function fetchSelectors(contextId: string): Promise<TestSelector[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`/api/tester/selectors?contextId=${contextId}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load selectors (${response.status})`);
    }

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

/**
 * Scan context files for testids and save to database
 */
export async function scanSelectors(
  contextId: string,
  projectId: string,
  saveToDb: boolean = true
): Promise<ScanResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Longer timeout for scan

  try {
    const response = await fetch('/api/tester/selectors/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextId, projectId, saveToDb }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Scan failed (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Scan request timed out');
    }
    throw err;
  }
}

/**
 * Delete a selector by ID
 */
export async function deleteSelector(selectorId: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`/api/tester/selectors/${selectorId}`, {
      method: 'DELETE',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete (${response.status})`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Delete request timed out');
    }
    throw err;
  }
}
