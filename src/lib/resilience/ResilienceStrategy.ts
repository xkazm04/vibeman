/**
 * Resilience Strategy Implementation
 *
 * Provides a composable resilience strategy with layered fallbacks.
 * Implements the Observer-Sentinel pattern for multi-modal completion detection.
 */

import type {
  DetectionLayer,
  DetectionResult,
  ResilienceConfig,
  ResilienceResult,
  ResilienceStrategy,
  SSELayerOptions,
  PollingLayerOptions,
  FileStateLayerOptions,
} from './types';

/**
 * Create a new resilience strategy
 */
export function createResilienceStrategy<T = unknown>(
  id: string,
  name: string,
  config: ResilienceConfig = {}
): ResilienceStrategy<T> {
  const layers: DetectionLayer<T>[] = [];

  const strategy: ResilienceStrategy<T> = {
    id,
    name,
    layers,
    config,

    addLayer(layer: DetectionLayer<T>) {
      layers.push(layer);
      // Keep sorted by priority
      layers.sort((a, b) => a.priority - b.priority);
    },

    removeLayer(layerId: string) {
      const index = layers.findIndex((l) => l.id === layerId);
      if (index !== -1) {
        const removed = layers.splice(index, 1)[0];
        removed.cleanup?.();
      }
    },

    setLayerEnabled(layerId: string, enabled: boolean) {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        layer.enabled = enabled;
      }
    },

    cleanup() {
      for (const layer of layers) {
        layer.cleanup?.();
      }
    },

    async execute(): Promise<ResilienceResult<T>> {
      const startTime = Date.now();
      const layersTried: string[] = [];
      const layerErrors: Record<string, string> = {};
      let currentLayerIndex = 0;

      const enabledLayers = layers.filter((l) => l.enabled);

      if (enabledLayers.length === 0) {
        return {
          success: false,
          layersTried: [],
          layerErrors: { _strategy: 'No enabled layers' },
          duration: Date.now() - startTime,
        };
      }

      while (currentLayerIndex < enabledLayers.length) {
        const layer = enabledLayers[currentLayerIndex];
        layersTried.push(layer.id);

        try {
          const result = await layer.detect();

          if (result.detected) {
            config.onSuccess?.(layer.id, result.value);
            return {
              success: true,
              value: result.value,
              successLayer: layer.id,
              layersTried,
              layerErrors,
              duration: Date.now() - startTime,
            };
          }

          // Detection ran but didn't find completion - try next layer
          if (result.error) {
            layerErrors[layer.id] = result.error;
            config.onLayerFailure?.(layer.id, result.error);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          layerErrors[layer.id] = errorMsg;
          config.onLayerFailure?.(layer.id, errorMsg);
        }

        // Move to next layer
        const nextLayer = enabledLayers[currentLayerIndex + 1];
        if (nextLayer) {
          config.onLayerSwitch?.(
            layer.id,
            nextLayer.id,
            layerErrors[layer.id] || 'No detection'
          );
        }

        currentLayerIndex++;

        // Check timeout
        if (config.timeout && Date.now() - startTime > config.timeout) {
          return {
            success: false,
            layersTried,
            layerErrors: { ...layerErrors, _timeout: 'Strategy timeout exceeded' },
            duration: Date.now() - startTime,
          };
        }
      }

      return {
        success: false,
        layersTried,
        layerErrors,
        duration: Date.now() - startTime,
      };
    },
  };

  return strategy;
}

/**
 * Create an SSE (Server-Sent Events) detection layer
 * Primary layer for real-time streaming communication
 */
export function createSSELayer<T = unknown>(
  id: string,
  options: SSELayerOptions,
  extractResult?: (data: unknown) => T | undefined
): DetectionLayer<T> {
  let eventSource: EventSource | null = null;
  let resolved = false;

  return {
    id,
    name: 'SSE Streaming',
    priority: 1,
    enabled: true,

    detect(): Promise<DetectionResult<T>> {
      return new Promise((resolve) => {
        resolved = false;
        eventSource = new EventSource(options.url);

        const completeEvent = options.completionEvent || 'result';
        const errorEvent = options.errorEvent || 'error';

        eventSource.onmessage = (event) => {
          if (resolved) return;

          try {
            const data = JSON.parse(event.data);
            options.onMessage?.(data);

            if (data.type === completeEvent) {
              resolved = true;
              eventSource?.close();
              resolve({
                detected: true,
                value: extractResult ? extractResult(data) : (data as T),
                layer: id,
              });
            } else if (data.type === errorEvent) {
              resolved = true;
              eventSource?.close();
              resolve({
                detected: false,
                error: data.error || 'SSE error event',
                layer: id,
              });
            }
          } catch (e) {
            // Parse error - continue listening
          }
        };

        eventSource.onerror = (event) => {
          if (resolved) return;
          resolved = true;
          options.onError?.(event);
          eventSource?.close();
          resolve({
            detected: false,
            error: 'SSE connection error',
            layer: id,
          });
        };
      });
    },

    cleanup() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    },
  };
}

/**
 * Create a polling detection layer
 * Fallback layer when streaming fails
 */
export function createPollingLayer<T = unknown>(
  id: string,
  options: PollingLayerOptions,
  extractResult?: (response: unknown) => T | undefined
): DetectionLayer<T> {
  let intervalId: NodeJS.Timeout | null = null;
  let stopped = false;

  return {
    id,
    name: 'HTTP Polling',
    priority: 2,
    enabled: true,

    detect(): Promise<DetectionResult<T>> {
      return new Promise((resolve) => {
        stopped = false;
        let attempts = 0;
        const maxAttempts = options.maxAttempts || Infinity;

        const poll = async () => {
          if (stopped) return;
          attempts++;

          try {
            const response = await fetch(options.url);
            if (!response.ok) {
              if (attempts >= maxAttempts) {
                resolve({
                  detected: false,
                  error: `Polling failed after ${attempts} attempts`,
                  layer: id,
                });
                return;
              }
              return; // Continue polling
            }

            const data = await response.json();

            if (options.isComplete(data)) {
              stopped = true;
              if (intervalId) clearInterval(intervalId);
              const value = extractResult
                ? extractResult(data)
                : options.extractResult
                  ? (options.extractResult(data) as T)
                  : (data as T);
              resolve({
                detected: true,
                value,
                layer: id,
              });
              return;
            }

            if (attempts >= maxAttempts) {
              stopped = true;
              if (intervalId) clearInterval(intervalId);
              resolve({
                detected: false,
                error: `Max polling attempts (${maxAttempts}) reached`,
                layer: id,
              });
            }
          } catch (error) {
            // Continue polling on error unless max attempts reached
            if (attempts >= maxAttempts) {
              stopped = true;
              if (intervalId) clearInterval(intervalId);
              resolve({
                detected: false,
                error: error instanceof Error ? error.message : 'Polling error',
                layer: id,
              });
            }
          }
        };

        // Start polling
        poll();
        intervalId = setInterval(poll, options.interval);
      });
    },

    cleanup() {
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

/**
 * Create a file state detection layer
 * Uses file system as durable event log - particularly elegant for completion detection
 */
export function createFileStateLayer<T = unknown>(
  id: string,
  options: FileStateLayerOptions,
  resultValue?: T
): DetectionLayer<T> {
  return {
    id,
    name: 'File State Check',
    priority: 3,
    enabled: true,

    async detect(): Promise<DetectionResult<T>> {
      try {
        const exists = await options.checkFn();

        // If absenceMeansComplete is true, file NOT existing means task completed
        // This is the pattern used for requirement files - deletion = completion
        const isComplete = options.absenceMeansComplete ? !exists : exists;

        if (isComplete) {
          return {
            detected: true,
            value: resultValue,
            layer: id,
          };
        }

        return {
          detected: false,
          layer: id,
        };
      } catch (error) {
        return {
          detected: false,
          error: error instanceof Error ? error.message : 'File state check error',
          layer: id,
        };
      }
    },
  };
}

/**
 * Create a one-shot detection layer from a simple async function
 * Useful for custom detection logic
 */
export function createCustomLayer<T = unknown>(
  id: string,
  name: string,
  priority: number,
  detectFn: () => Promise<DetectionResult<T>>,
  cleanupFn?: () => void
): DetectionLayer<T> {
  return {
    id,
    name,
    priority,
    enabled: true,
    detect: detectFn,
    cleanup: cleanupFn,
  };
}
