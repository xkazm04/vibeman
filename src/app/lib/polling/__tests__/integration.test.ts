/**
 * Integration tests for the polling library
 * Demonstrates multiple concurrent pollers and cleanup scenarios
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePollingTask } from '../index';
import {
  createLogRefreshPoller,
  createStatusCheckPoller,
  createHealthMonitorPoller,
  createRealTimePoller,
} from '../factories';
import { POLLING_PRESETS, mergePreset } from '../presets';

// Mock fetch for tests
global.fetch = vi.fn();

describe('Polling Library Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Polling Functionality', () => {
    it('should poll at specified interval', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
        })
      );

      // Initial execution
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

      // Advance time and verify polling
      vi.advanceTimersByTime(1000);
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

      vi.advanceTimersByTime(1000);
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));

      expect(result.current.data).toEqual({ data: 'test' });
      expect(result.current.stats.totalPolls).toBe(3);
    });

    it('should handle manual start and stop', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          enabled: false,
        })
      );

      expect(result.current.isPolling).toBe(false);

      // Start polling
      result.current.start();
      await waitFor(() => expect(result.current.isPolling).toBe(true));

      vi.advanceTimersByTime(1000);
      await waitFor(() => expect(fetcher).toHaveBeenCalled());

      // Stop polling
      result.current.stop();
      await waitFor(() => expect(result.current.isPolling).toBe(false));

      const callCount = fetcher.mock.calls.length;
      vi.advanceTimersByTime(2000);
      expect(fetcher).toHaveBeenCalledTimes(callCount); // No additional calls
    });

    it('should trigger manual poll', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'manual' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 5000,
          enabled: false,
        })
      );

      await result.current.trigger();
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      expect(result.current.data).toEqual({ data: 'manual' });
    });

    it('should reset state and restart polling', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
        })
      );

      await waitFor(() => expect(fetcher).toHaveBeenCalled());

      // Accumulate some stats
      vi.advanceTimersByTime(3000);
      await waitFor(() => expect(result.current.stats.totalPolls).toBeGreaterThan(1));

      // Reset
      result.current.reset();
      await waitFor(() => {
        expect(result.current.data).toBeNull();
        expect(result.current.stats.totalPolls).toBe(0);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 5000,
          executeImmediately: true,
          maxRetries: 3,
          retryBackoff: 'exponential',
          retryDelay: 100,
        })
      );

      // First attempt fails
      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect(result.current.retryCount).toBe(1);

      // First retry (100ms delay)
      vi.advanceTimersByTime(100);
      await waitFor(() => expect(result.current.retryCount).toBe(2));

      // Second retry (200ms delay)
      vi.advanceTimersByTime(200);
      await waitFor(() => {
        expect(result.current.data).toEqual({ data: 'success' });
        expect(result.current.error).toBeNull();
        expect(result.current.retryCount).toBe(0);
      });
    });

    it('should stop retrying after max retries', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Always fails'));
      const onError = vi.fn();

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 5000,
          executeImmediately: true,
          maxRetries: 2,
          retryDelay: 100,
          onError,
        })
      );

      await waitFor(() => expect(result.current.error).toBeTruthy());

      // Wait for all retries
      vi.advanceTimersByTime(1000);
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(3)); // Initial + 2 retries

      expect(result.current.error?.message).toBe('Always fails');
    });
  });

  describe('Adaptive Polling', () => {
    it('should increase interval on consecutive successes', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 2000,
          adaptive: {
            enabled: true,
            minInterval: 1000,
            maxInterval: 10000,
            successMultiplier: 2,
            successThreshold: 2,
          },
        })
      );

      const initialInterval = result.current.currentInterval;

      // Wait for 2 successful polls
      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(result.current.stats.successfulPolls).toBeGreaterThan(0));

      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(result.current.stats.consecutiveSuccesses).toBeGreaterThanOrEqual(2));

      // Interval should increase
      expect(result.current.currentInterval).toBeGreaterThan(initialInterval);
    });

    it('should decrease interval on consecutive failures', async () => {
      let failCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        if (failCount++ < 3) {
          return Promise.reject(new Error('Fail'));
        }
        return Promise.resolve({ data: 'success' });
      });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 5000,
          maxRetries: 0, // No retries for this test
          adaptive: {
            enabled: true,
            minInterval: 1000,
            maxInterval: 10000,
            failureMultiplier: 0.5,
            failureThreshold: 2,
          },
        })
      );

      const initialInterval = result.current.currentInterval;

      // Wait for consecutive failures
      vi.advanceTimersByTime(5000);
      await waitFor(() => expect(result.current.stats.failedPolls).toBeGreaterThan(0));

      vi.advanceTimersByTime(5000);
      await waitFor(() => expect(result.current.stats.consecutiveFailures).toBeGreaterThanOrEqual(2));

      // Interval should decrease
      expect(result.current.currentInterval).toBeLessThan(initialInterval);
    });
  });

  describe('Multiple Concurrent Pollers', () => {
    it('should run multiple pollers independently', async () => {
      const fetcher1 = vi.fn().mockResolvedValue({ id: 1 });
      const fetcher2 = vi.fn().mockResolvedValue({ id: 2 });
      const fetcher3 = vi.fn().mockResolvedValue({ id: 3 });

      const { result: result1 } = renderHook(() =>
        usePollingTask(fetcher1, { interval: 1000, executeImmediately: true })
      );

      const { result: result2 } = renderHook(() =>
        usePollingTask(fetcher2, { interval: 2000, executeImmediately: true })
      );

      const { result: result3 } = renderHook(() =>
        usePollingTask(fetcher3, { interval: 3000, executeImmediately: true })
      );

      await waitFor(() => {
        expect(fetcher1).toHaveBeenCalled();
        expect(fetcher2).toHaveBeenCalled();
        expect(fetcher3).toHaveBeenCalled();
      });

      vi.advanceTimersByTime(6000);

      await waitFor(() => {
        expect(result1.current.stats.totalPolls).toBeGreaterThan(result2.current.stats.totalPolls);
        expect(result2.current.stats.totalPolls).toBeGreaterThan(result3.current.stats.totalPolls);
      });
    });

    it('should clean up all pollers on unmount', async () => {
      const fetchers = [
        vi.fn().mockResolvedValue({ id: 1 }),
        vi.fn().mockResolvedValue({ id: 2 }),
        vi.fn().mockResolvedValue({ id: 3 }),
      ];

      const hooks = fetchers.map(fetcher =>
        renderHook(() => usePollingTask(fetcher, { interval: 1000 }))
      );

      await waitFor(() => {
        fetchers.forEach(fetcher => expect(fetcher).toHaveBeenCalled());
      });

      // Unmount all hooks
      hooks.forEach(hook => hook.unmount());

      const totalCalls = fetchers.reduce((sum, f) => sum + f.mock.calls.length, 0);

      // Advance time and verify no more calls
      vi.advanceTimersByTime(5000);
      const newTotalCalls = fetchers.reduce((sum, f) => sum + f.mock.calls.length, 0);

      expect(newTotalCalls).toBe(totalCalls);
    });
  });

  describe('Factory Functions', () => {
    it('should create log refresh poller with correct config', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ['log1', 'log2', 'log3'],
      });

      const logPoller = createLogRefreshPoller('/api/logs/server-1', {
        maxLines: 100,
        filter: 'ERROR',
        interval: 2000,
      });

      const { result } = renderHook(() =>
        usePollingTask(logPoller.fetcher, logPoller.config)
      );

      await waitFor(() => expect(result.current.data).toBeTruthy());

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs/server-1')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('maxLines=100')
      );
      expect(result.current.data).toEqual(['log1', 'log2', 'log3']);
    });

    it('should create status check poller with stop condition', async () => {
      let status = 'running';
      (global.fetch as vi.Mock).mockImplementation(async () => ({
        ok: true,
        json: async () => ({ status }),
      }));

      const statusPoller = createStatusCheckPoller('/api/task/status', {
        expectedStatus: ['completed'],
        stopOnMatch: true,
        interval: 1000,
      });

      const { result } = renderHook(() =>
        usePollingTask(statusPoller.fetcher, statusPoller.config)
      );

      await waitFor(() => expect(result.current.data).toBeTruthy());
      expect(result.current.isPolling).toBe(true);

      // Change status to completed
      status = 'completed';
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(result.current.data?.status).toBe('completed');
        expect(result.current.isPolling).toBe(false);
      });
    });

    it('should create health monitor for multiple endpoints', async () => {
      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ healthy: true }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ healthy: true }) })
        .mockRejectedValueOnce(new Error('Endpoint down'));

      const healthPoller = createHealthMonitorPoller(
        ['/api/health/db', '/api/health/cache', '/api/health/api'],
        { interval: 5000 }
      );

      const { result } = renderHook(() =>
        usePollingTask(healthPoller.fetcher, healthPoller.config)
      );

      await waitFor(() => expect(result.current.data).toBeTruthy());

      expect(result.current.data?.totalChecks).toBe(3);
      expect(result.current.data?.successfulChecks).toBe(2);
      expect(result.current.data?.failedChecks).toBe(1);
      expect(result.current.data?.failureRate).toBeCloseTo(33.33, 1);
    });

    it('should create real-time poller with history buffer', async () => {
      let counter = 0;
      (global.fetch as vi.Mock).mockImplementation(async () => ({
        ok: true,
        json: async () => ({ value: counter++ }),
      }));

      const realtimePoller = createRealTimePoller('/api/metrics', {
        interval: 500,
        bufferSize: 5,
      });

      const { result } = renderHook(() =>
        usePollingTask(realtimePoller.fetcher, realtimePoller.config)
      );

      // Wait for multiple polls
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(500);
        await waitFor(() => expect(result.current.stats.totalPolls).toBeGreaterThan(i));
      }

      expect(result.current.data?.history).toBeDefined();
      expect(result.current.data?.history.length).toBeGreaterThan(0);
    });
  });

  describe('Preset Configurations', () => {
    it('should use aggressive preset correctly', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, POLLING_PRESETS.aggressive)
      );

      await waitFor(() => expect(fetcher).toHaveBeenCalled());
      expect(result.current.currentInterval).toBe(1500);
    });

    it('should merge preset with custom options', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      const onSuccess = vi.fn();

      const config = mergePreset('conservative', {
        interval: 10000,
        onSuccess,
      });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, config)
      );

      await waitFor(() => expect(fetcher).toHaveBeenCalled());
      expect(result.current.currentInterval).toBe(10000);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance Statistics', () => {
    it('should track polling statistics accurately', async () => {
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        if (callCount++ % 3 === 0) {
          return Promise.reject(new Error('Periodic failure'));
        }
        return Promise.resolve({ data: 'success' });
      });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          maxRetries: 0,
          executeImmediately: true,
        })
      );

      // Execute multiple polls
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
        await waitFor(() => expect(result.current.stats.totalPolls).toBeGreaterThan(i));
      }

      expect(result.current.stats.totalPolls).toBeGreaterThan(0);
      expect(result.current.stats.successfulPolls).toBeGreaterThan(0);
      expect(result.current.stats.failedPolls).toBeGreaterThan(0);
      expect(result.current.stats.lastPollTime).toBeTruthy();
    });

    it('should calculate average latency', async () => {
      const fetcher = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 50))
      );

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
        })
      );

      vi.advanceTimersByTime(50);
      await waitFor(() => expect(result.current.stats.totalPolls).toBeGreaterThan(0));

      expect(result.current.stats.averageLatency).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle timeout', async () => {
      const fetcher = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 5000,
          timeout: 100,
          executeImmediately: true,
        })
      );

      vi.advanceTimersByTime(100);
      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect(result.current.error?.message).toContain('timeout');
    });

    it('should handle abort controller cleanup', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result, unmount } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
        })
      );

      await waitFor(() => expect(fetcher).toHaveBeenCalled());

      // Unmount should abort ongoing operations
      unmount();

      // Advance time and ensure no more calls
      const callCount = fetcher.mock.calls.length;
      vi.advanceTimersByTime(5000);
      expect(fetcher).toHaveBeenCalledTimes(callCount);
    });

    it('should call onError callback on failures', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Test error'));
      const onError = vi.fn();

      renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
          maxRetries: 2,
          onError,
        })
      );

      await waitFor(() => expect(onError).toHaveBeenCalled());
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.any(Number)
      );
    });
  });

  describe('Conditional Polling', () => {
    it('should stop polling when shouldContinue returns false', async () => {
      let counter = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        return Promise.resolve({ count: ++counter });
      });

      const { result } = renderHook(() =>
        usePollingTask(fetcher, {
          interval: 1000,
          executeImmediately: true,
          shouldContinue: (data) => data.count < 3,
        })
      );

      // Poll until counter reaches 3
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000);
        await waitFor(() => expect(result.current.stats.totalPolls).toBeGreaterThan(i));

        if (!result.current.isPolling) break;
      }

      expect(result.current.data?.count).toBe(3);
      expect(result.current.isPolling).toBe(false);
    });
  });
});
