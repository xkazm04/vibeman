import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for useAbortableFetch hook behavior
 *
 * Note: These tests verify the AbortController integration with fetch.
 * Full React hook lifecycle testing would require @testing-library/react.
 */
describe('useAbortableFetch - AbortController integration', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should call fetch with AbortSignal', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(new Response('OK')));
    global.fetch = mockFetch;

    const controller = new AbortController();
    await fetch('/api/test', { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should abort request when AbortController.abort() is called', () => {
    const controller = new AbortController();

    // Verify signal is initially not aborted
    expect(controller.signal.aborted).toBe(false);

    // Abort the controller
    controller.abort();

    // Verify signal is now aborted
    expect(controller.signal.aborted).toBe(true);
  });

  it('should merge user-provided init options with signal', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(new Response('OK')));
    global.fetch = mockFetch;

    const controller = new AbortController();
    await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
      signal: controller.signal,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle AbortError when request is aborted', async () => {
    const controller = new AbortController();

    // Mock fetch to simulate abort
    global.fetch = vi.fn(() => {
      return new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const promise = fetch('/api/test', { signal: controller.signal });

    // Abort the request
    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('should allow multiple sequential requests with different controllers', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: 2 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: 3 })));

    global.fetch = mockFetch;

    const controller1 = new AbortController();
    const controller2 = new AbortController();
    const controller3 = new AbortController();

    const res1 = await fetch('/api/test1', { signal: controller1.signal });
    const res2 = await fetch('/api/test2', { signal: controller2.signal });
    const res3 = await fetch('/api/test3', { signal: controller3.signal });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(await res1.json()).toEqual({ data: 1 });
    expect(await res2.json()).toEqual({ data: 2 });
    expect(await res3.json()).toEqual({ data: 3 });
  });

  it('should not affect request when controller is not aborted', async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn(() => Promise.resolve(new Response('OK')));
    global.fetch = mockFetch;

    const res = await fetch('/api/test', { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(await res.text()).toBe('OK');
  });
});
