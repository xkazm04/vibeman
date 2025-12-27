/**
 * Performance Monitoring Utilities
 *
 * Provides tools for tracking page load metrics, component render times,
 * and lazy loading performance benchmarks.
 */

export interface PerformanceMetrics {
  // Navigation timing
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;

  // Custom metrics
  featureLoadTimes: Record<string, number>;
  componentRenderTimes: Record<string, number>;
}

export interface LazyLoadMetric {
  featureName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

// Store for tracking lazy load metrics
const lazyLoadMetrics: LazyLoadMetric[] = [];
const componentRenderTimes: Record<string, number[]> = {};

/**
 * Mark the start of a lazy load operation
 */
export function markLazyLoadStart(featureName: string): number {
  return performance.now();
}

/**
 * Mark the end of a lazy load operation and record the metric
 */
export function markLazyLoadEnd(
  featureName: string,
  startTime: number,
  success: boolean = true,
  error?: string
): LazyLoadMetric {
  const endTime = performance.now();
  const metric: LazyLoadMetric = {
    featureName,
    startTime,
    endTime,
    duration: endTime - startTime,
    success,
    error,
  };

  lazyLoadMetrics.push(metric);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[LazyLoad] ${featureName}: ${metric.duration.toFixed(2)}ms ${success ? '✓' : '✗'}`
    );
  }

  return metric;
}

/**
 * Track component render time
 */
export function trackRenderTime(componentName: string, duration: number): void {
  if (!componentRenderTimes[componentName]) {
    componentRenderTimes[componentName] = [];
  }
  componentRenderTimes[componentName].push(duration);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Render] ${componentName}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Get all lazy load metrics
 */
export function getLazyLoadMetrics(): LazyLoadMetric[] {
  return [...lazyLoadMetrics];
}

/**
 * Get average render time for a component
 */
export function getAverageRenderTime(componentName: string): number | null {
  const times = componentRenderTimes[componentName];
  if (!times || times.length === 0) return null;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

/**
 * Get Web Vitals and navigation timing metrics
 */
export function getPerformanceMetrics(): Partial<PerformanceMetrics> {
  if (typeof window === 'undefined') return {};

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paintEntries = performance.getEntriesByType('paint');

  const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');

  // Build feature load times from our metrics
  const featureLoadTimes: Record<string, number> = {};
  lazyLoadMetrics.forEach(metric => {
    if (metric.success) {
      featureLoadTimes[metric.featureName] = metric.duration;
    }
  });

  // Build average component render times
  const avgRenderTimes: Record<string, number> = {};
  Object.keys(componentRenderTimes).forEach(name => {
    const avg = getAverageRenderTime(name);
    if (avg !== null) {
      avgRenderTimes[name] = avg;
    }
  });

  return {
    navigationStart: navigation?.startTime ?? 0,
    domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
    loadComplete: navigation?.loadEventEnd ?? 0,
    firstContentfulPaint: fcp?.startTime ?? 0,
    featureLoadTimes,
    componentRenderTimes: avgRenderTimes,
  };
}

/**
 * Generate a performance report
 */
export function generatePerformanceReport(): string {
  const metrics = getPerformanceMetrics();
  const lazyMetrics = getLazyLoadMetrics();

  const lines = [
    '=== Performance Report ===',
    '',
    '--- Navigation Timing ---',
    `DOM Content Loaded: ${metrics.domContentLoaded?.toFixed(2)}ms`,
    `Load Complete: ${metrics.loadComplete?.toFixed(2)}ms`,
    `First Contentful Paint: ${metrics.firstContentfulPaint?.toFixed(2)}ms`,
    '',
    '--- Lazy Load Metrics ---',
  ];

  if (lazyMetrics.length === 0) {
    lines.push('No lazy loads recorded yet.');
  } else {
    const successful = lazyMetrics.filter(m => m.success);
    const failed = lazyMetrics.filter(m => !m.success);
    const avgDuration = successful.length > 0
      ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length
      : 0;

    lines.push(`Total lazy loads: ${lazyMetrics.length}`);
    lines.push(`Successful: ${successful.length}`);
    lines.push(`Failed: ${failed.length}`);
    lines.push(`Average load time: ${avgDuration.toFixed(2)}ms`);
    lines.push('');
    lines.push('Feature breakdown:');

    successful.forEach(m => {
      lines.push(`  ${m.featureName}: ${m.duration.toFixed(2)}ms`);
    });
  }

  lines.push('');
  lines.push('--- Component Render Times ---');

  const renderMetrics = metrics.componentRenderTimes ?? {};
  const renderKeys = Object.keys(renderMetrics);

  if (renderKeys.length === 0) {
    lines.push('No render times recorded yet.');
  } else {
    renderKeys.forEach(name => {
      lines.push(`  ${name}: ${renderMetrics[name].toFixed(2)}ms avg`);
    });
  }

  return lines.join('\n');
}

/**
 * Clear all recorded metrics (useful for testing)
 */
export function clearMetrics(): void {
  lazyLoadMetrics.length = 0;
  Object.keys(componentRenderTimes).forEach(key => {
    delete componentRenderTimes[key];
  });
}

/**
 * Hook to measure component mount time
 * Usage: const measureMount = usePerformanceMeasure('MyComponent');
 */
export function createMountMeasure(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    trackRenderTime(componentName, duration);
  };
}
