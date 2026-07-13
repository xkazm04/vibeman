/**
 * exportContextMapToFile — surfaces every terminal export state to the user via
 * the shared toast channel (Direction 1: disk-write failure must never be silent).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const successSpy = vi.fn();
const errorSpy = vi.fn();
vi.mock('@/stores/messageStore', () => ({
  toast: {
    success: (t: string, m?: string) => successSpy(t, m),
    error: (t: string, m?: string) => errorSpy(t, m),
  },
}));

import { exportContextMapToFile } from './contextApi';

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('exportContextMapToFile', () => {
  beforeEach(() => {
    successSpy.mockClear();
    errorSpy.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toasts success and returns the export path on 200', async () => {
    global.fetch = mockFetch(200, { success: true, exportedTo: '/proj/context-map.json' });
    const res = await exportContextMapToFile('p1');
    expect(res).toEqual({ success: true, exportedTo: '/proj/context-map.json' });
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('surfaces a silent disk-write failure (HTTP 207) as an error toast', async () => {
    global.fetch = mockFetch(207, {
      success: false,
      error: 'Failed to write file to disk',
      warning: 'Data is returned in the response body, but the file was not written',
    });
    const res = await exportContextMapToFile('p1');
    expect(res.success).toBe(false);
    expect(res.diskWriteFailed).toBe(true);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // The user sees the human-readable warning, not just a status code.
    expect(errorSpy.mock.calls[0][1]).toMatch(/not written/i);
    expect(successSpy).not.toHaveBeenCalled();
  });

  it('toasts an error on a hard failure', async () => {
    global.fetch = mockFetch(500, { success: false, error: 'Project not found' });
    const res = await exportContextMapToFile('p1');
    expect(res.success).toBe(false);
    expect(res.diskWriteFailed).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Context map export failed', 'Project not found');
  });

  it('toasts an error when fetch itself throws', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const res = await exportContextMapToFile('p1');
    expect(res.success).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Context map export failed', 'network down');
  });
});
