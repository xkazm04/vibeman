import { renderHook, waitFor, act } from '@testing-library/react';
import { usePollingTask, getPollingPulseAnimation } from '../usePollingTask';

// Helper to create a mock polling function
const createMockPollingFn = () => {
  const mockFn = jest.fn();
  return mockFn;
};

// Helper to create a delayed promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('usePollingTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Polling', () => {
    it('should execute polling function immediately on mount', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it('should poll at specified interval', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      // Initial call
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // First interval
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Second interval
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should update data state with polling results', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.data).toBe('test-data');
      expect(result.current.error).toBe(null);
    });

    it('should set isLoading to false after successful poll', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('AbortController and Cleanup', () => {
    it('should pass AbortSignal to polling function', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      const signal = mockFn.mock.calls[0][0];
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should abort ongoing request on unmount', async () => {
      let capturedSignal: AbortSignal | null = null;
      const mockFn = jest.fn().mockImplementation(async (signal: AbortSignal) => {
        capturedSignal = signal;
        await delay(500);
        return 'test-data';
      });

      const { unmount } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(capturedSignal).not.toBe(null);
      expect(capturedSignal!.aborted).toBe(false);

      unmount();

      expect(capturedSignal!.aborted).toBe(true);
    });

    it('should abort and restart on dependency change', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');
      let dependency = 'dep1';

      const { rerender } = renderHook(
        ({ dep }) => usePollingTask(mockFn, { interval: 1000, dependencies: [dep] }),
        { initialProps: { dep: dependency } }
      );

      await act(async () => {
        await Promise.resolve();
      });

      const firstSignal = mockFn.mock.calls[0][0];
      expect(firstSignal.aborted).toBe(false);

      dependency = 'dep2';
      rerender({ dep: dependency });

      // First signal should be aborted
      expect(firstSignal.aborted).toBe(true);

      await act(async () => {
        await Promise.resolve();
      });

      // New call with new signal
      expect(mockFn).toHaveBeenCalledTimes(2);
      const secondSignal = mockFn.mock.calls[1][0];
      expect(secondSignal).not.toBe(firstSignal);
    });

    it('should clear timeout on unmount', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { unmount } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      unmount();

      // Advance timers - should not trigger new poll
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not update state after abort', async () => {
      const mockFn = jest.fn().mockImplementation(async (signal: AbortSignal) => {
        await delay(100);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        return 'test-data';
      });

      const { result, unmount } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      expect(result.current.data).toBe(null);

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(200);
        await Promise.resolve();
      });

      // Data should remain null after abort
      expect(result.current.data).toBe(null);
    });
  });

  describe('Manual Control', () => {
    it('should cancel polling when cancel() is called', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.cancel();
      });

      // Advance timers - should not trigger new poll
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should restart polling when restart() is called', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Restart
      await act(async () => {
        result.current.restart();
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should reset retry count on restart', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) throw new Error('Test error');
        return 'test-data';
      });

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, maxRetries: 3 })
      );

      // First call - error
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(1);

      // Restart should reset retry count
      await act(async () => {
        result.current.restart();
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(1); // First error after restart
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should set error state on polling failure', async () => {
      const testError = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.data).toBe(null);
    });

    it('should increment retry count on failure', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, maxRetries: 3 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(2);
    });

    it('should apply exponential backoff on retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, maxRetries: 3, backoffMultiplier: 2 })
      );

      // Initial call
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.current.retryCount).toBe(1);

      // First retry - should wait 2000ms (1000 * 2^1)
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(1); // Not yet

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.current.retryCount).toBe(2);

      // Second retry - should wait 4000ms (1000 * 2^2)
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(2); // Not yet

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should stop incrementing retryCount after maxRetries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, maxRetries: 2 })
      );

      // Initial call - retry count becomes 1
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.retryCount).toBe(1);

      // First retry - retry count becomes 2
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
      expect(result.current.retryCount).toBe(2);

      // Second retry - retry count should stay at 2 (max reached)
      await act(async () => {
        jest.advanceTimersByTime(4000);
        await Promise.resolve();
      });
      expect(result.current.retryCount).toBe(2);
    });

    it('should reset retry count on successful poll', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Test error');
        return 'test-data';
      });

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, maxRetries: 3 })
      );

      // First call - error
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(1);
      expect(result.current.error).not.toBe(null);

      // Second call - success
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toBe('test-data');
    });

    it('should implement stale-while-revalidate pattern', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return 'first-data';
        if (callCount === 2) throw new Error('Test error');
        return 'third-data';
      });

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      // First call - success
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.data).toBe('first-data');
      expect(result.current.error).toBe(null);

      // Second call - error (should keep previous data)
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(result.current.data).toBe('first-data'); // Still showing old data
      expect(result.current.error).not.toBe(null);

      // Third call - success (should update data)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(result.current.data).toBe('third-data');
      expect(result.current.error).toBe(null);
    });

    it('should ignore AbortError and not update error state', async () => {
      const mockFn = jest.fn().mockImplementation(async (signal: AbortSignal) => {
        await delay(100);
        if (signal.aborted) {
          const error = new DOMException('Aborted', 'AbortError');
          throw error;
        }
        return 'test-data';
      });

      const { result, unmount } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Start Behavior', () => {
    it('should not start polling when startImmediately is false', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, startImmediately: false })
      );

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(mockFn).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should start polling when restart() is called after startImmediately: false', async () => {
      const mockFn = jest.fn().mockResolvedValue('test-data');

      const { result } = renderHook(() =>
        usePollingTask(mockFn, { interval: 1000, startImmediately: false })
      );

      expect(mockFn).not.toHaveBeenCalled();

      await act(async () => {
        result.current.restart();
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Race Conditions', () => {
    it('should handle rapid dependency changes without race conditions', async () => {
      const mockFn = jest.fn().mockImplementation(async (signal: AbortSignal) => {
        await delay(100);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        return 'test-data';
      });

      let dependency = 1;

      const { rerender } = renderHook(
        ({ dep }) => usePollingTask(mockFn, { interval: 1000, dependencies: [dep] }),
        { initialProps: { dep: dependency } }
      );

      // Rapid dependency changes
      await act(async () => {
        dependency = 2;
        rerender({ dep: dependency });
        await Promise.resolve();

        dependency = 3;
        rerender({ dep: dependency });
        await Promise.resolve();

        dependency = 4;
        rerender({ dep: dependency });
        await Promise.resolve();
      });

      // Should have 4 calls total (initial + 3 changes)
      expect(mockFn).toHaveBeenCalledTimes(4);

      // First 3 signals should be aborted
      expect(mockFn.mock.calls[0][0].aborted).toBe(true);
      expect(mockFn.mock.calls[1][0].aborted).toBe(true);
      expect(mockFn.mock.calls[2][0].aborted).toBe(true);

      // Last signal should not be aborted
      expect(mockFn.mock.calls[3][0].aborted).toBe(false);
    });

    it('should not have stale closures affecting polling interval', async () => {
      const results: number[] = [];
      const mockFn = jest.fn().mockImplementation(async () => {
        results.push(Date.now());
        return 'test-data';
      });

      renderHook(() =>
        usePollingTask(mockFn, { interval: 1000 })
      );

      // First call
      await act(async () => {
        await Promise.resolve();
      });

      // Second call after 1000ms
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Third call after another 1000ms
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Type Safety', () => {
    it('should handle different data types', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const mockData: TestData = { id: 1, name: 'test' };
      const mockFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        usePollingTask<TestData>(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.data?.id).toBe(1);
      expect(result.current.data?.name).toBe('test');
    });

    it('should handle null and undefined gracefully', async () => {
      const mockFn = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() =>
        usePollingTask<string | null>(mockFn, { interval: 1000 })
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });
});

describe('getPollingPulseAnimation', () => {
  it('should return base duration for zero retries', () => {
    expect(getPollingPulseAnimation(0)).toBe('2s');
  });

  it('should return faster duration for retries', () => {
    expect(getPollingPulseAnimation(1)).toBe('1s');
    expect(getPollingPulseAnimation(3)).toBe('0.5s');
  });

  it('should not go below minimum duration', () => {
    expect(getPollingPulseAnimation(10)).toBe('0.5s');
    expect(getPollingPulseAnimation(100)).toBe('0.5s');
  });
});
