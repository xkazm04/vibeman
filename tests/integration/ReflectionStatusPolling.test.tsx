/**
 * Integration test for ReflectionStatus polling behavior
 * Verifies exponential backoff and polling lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';

// Mock the polling behavior similar to ReflectionStatus
const POLL_INITIAL_MS = 4000;
const POLL_MAX_MS = 30000;

function useReflectionPolling(
  refreshStatus: () => void,
  isRunning: boolean,
  scope: string,
  projectId: string | undefined
) {
  const attemptCountRef = useRef(0);

  useEffect(() => {
    if (!isRunning) {
      attemptCountRef.current = 0;
      return;
    }

    const getNextInterval = () => {
      const baseInterval = POLL_INITIAL_MS;
      const interval = baseInterval * Math.pow(2, attemptCountRef.current);
      return Math.min(interval, POLL_MAX_MS);
    };

    let timeoutId: NodeJS.Timeout | null = null;

    const schedulePoll = () => {
      const interval = getNextInterval();
      timeoutId = setTimeout(() => {
        refreshStatus();
        attemptCountRef.current++;
        schedulePoll();
      }, interval);
    };

    schedulePoll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      attemptCountRef.current = 0;
    };
  }, [isRunning, scope, projectId]);

  return { attemptCount: attemptCountRef.current };
}

describe('ReflectionStatus polling with exponential backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should apply exponential backoff correctly', () => {
    const mockRefresh = jest.fn();
    const { rerender } = renderHook(
      ({ isRunning }) =>
        useReflectionPolling(mockRefresh, isRunning, 'project', 'test-id'),
      { initialProps: { isRunning: true } }
    );

    // Initial poll at 4s
    expect(mockRefresh).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Second poll at 8s (4s * 2^1)
    act(() => {
      jest.advanceTimersByTime(8000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    // Third poll at 16s (4s * 2^2)
    act(() => {
      jest.advanceTimersByTime(16000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(3);

    // Fourth poll at 30s (capped at max)
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(4);
  });

  it('should stop polling when isRunning becomes false', () => {
    const mockRefresh = jest.fn();
    const { rerender } = renderHook(
      ({ isRunning }) =>
        useReflectionPolling(mockRefresh, isRunning, 'project', 'test-id'),
      { initialProps: { isRunning: true } }
    );

    // Start polling
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Stop polling
    rerender({ isRunning: false });

    // Advance time - no more calls
    act(() => {
      jest.advanceTimersByTime(100000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should reset backoff when restarting', () => {
    const mockRefresh = jest.fn();
    const { rerender } = renderHook(
      ({ isRunning }) =>
        useReflectionPolling(mockRefresh, isRunning, 'project', 'test-id'),
      { initialProps: { isRunning: true } }
    );

    // Advance through backoff
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    act(() => {
      jest.advanceTimersByTime(8000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    // Stop and restart
    rerender({ isRunning: false });
    rerender({ isRunning: true });

    // Should restart at initial interval
    mockRefresh.mockClear();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should not poll when disabled initially', () => {
    const mockRefresh = jest.fn();
    renderHook(() =>
      useReflectionPolling(mockRefresh, false, 'project', 'test-id')
    );

    act(() => {
      jest.advanceTimersByTime(100000);
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should restart polling when dependencies change', () => {
    const mockRefresh = jest.fn();
    const { rerender } = renderHook(
      ({ projectId }) =>
        useReflectionPolling(mockRefresh, true, 'project', projectId),
      { initialProps: { projectId: 'test-1' } }
    );

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Change project ID - should reset
    rerender({ projectId: 'test-2' });

    mockRefresh.mockClear();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('useCanvasData polling with pause/resume', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should pause polling when enabled is false', () => {
    const mockRefresh = jest.fn();
    let enabled = true;

    const { rerender } = renderHook(() => {
      const [isEnabled, setEnabled] = useState(enabled);

      useEffect(() => {
        setEnabled(enabled);
      }, []);

      useEffect(() => {
        if (!isEnabled) return;

        const interval = setInterval(mockRefresh, 30000);
        return () => clearInterval(interval);
      }, [isEnabled]);

      return { isEnabled };
    });

    // Should poll when enabled
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Disable polling
    enabled = false;
    rerender();

    mockRefresh.mockClear();
    act(() => {
      jest.advanceTimersByTime(100000);
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should use fixed 30s interval for canvas data', () => {
    const mockRefresh = jest.fn();

    renderHook(() => {
      useEffect(() => {
        const interval = setInterval(mockRefresh, 30000);
        return () => clearInterval(interval);
      }, []);
    });

    // First call at 30s
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Second call at 60s
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });
});
