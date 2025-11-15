/**
 * Worker Manager
 * Manages Web Worker lifecycle and message passing for blueprint scans
 */

import type { WorkerRequest, WorkerResponse } from './types';

export type ScanType = 'build' | 'contexts' | 'photo' | 'structure' | 'vision';

export interface WorkerManagerCallbacks {
  onProgress?: (progress: number) => void;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

/**
 * Worker Manager class to handle Web Worker lifecycle
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private scanType: ScanType;

  constructor(scanType: ScanType) {
    this.scanType = scanType;
  }

  /**
   * Execute a scan using the Web Worker
   */
  async execute<TPayload, TResult>(
    payload: TPayload,
    callbacks: WorkerManagerCallbacks
  ): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      try {
        // Create worker based on scan type
        this.worker = this.createWorker(this.scanType);

        // Set up message handler
        this.worker.onmessage = (e: MessageEvent<WorkerResponse<TResult>>) => {
          const { type, progress, data, error } = e.data;

          switch (type) {
            case 'progress':
              if (progress !== undefined && callbacks.onProgress) {
                callbacks.onProgress(progress);
              }
              break;

            case 'success':
              if (callbacks.onSuccess && data !== undefined) {
                callbacks.onSuccess(data);
              }
              this.terminate();
              resolve(data as TResult);
              break;

            case 'error':
              if (callbacks.onError && error) {
                callbacks.onError(error);
              }
              this.terminate();
              reject(new Error(error || 'Worker failed'));
              break;
          }
        };

        // Set up error handler
        this.worker.onerror = (error) => {
          const errorMsg = `Worker error: ${error.message}`;
          if (callbacks.onError) {
            callbacks.onError(errorMsg);
          }
          this.terminate();
          reject(new Error(errorMsg));
        };

        // Send scan request to worker
        const request: WorkerRequest<TPayload> = {
          type: 'scan',
          payload,
        };
        this.worker.postMessage(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to create worker';
        if (callbacks.onError) {
          callbacks.onError(errorMsg);
        }
        this.terminate();
        reject(new Error(errorMsg));
      }
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Create a worker based on scan type
   */
  private createWorker(scanType: ScanType): Worker {
    switch (scanType) {
      case 'build':
        return new Worker(
          new URL('./buildScan.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'contexts':
        return new Worker(
          new URL('./contextsScan.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'photo':
        return new Worker(
          new URL('./photoScan.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'structure':
        return new Worker(
          new URL('./structureScan.worker.ts', import.meta.url),
          { type: 'module' }
        );
      case 'vision':
        return new Worker(
          new URL('./visionScan.worker.ts', import.meta.url),
          { type: 'module' }
        );
      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
  }
}

/**
 * Helper function to create and execute a worker
 */
export async function executeWorkerScan<TPayload, TResult>(
  scanType: ScanType,
  payload: TPayload,
  callbacks: WorkerManagerCallbacks
): Promise<TResult> {
  const manager = new WorkerManager(scanType);
  try {
    return await manager.execute<TPayload, TResult>(payload, callbacks);
  } finally {
    manager.terminate();
  }
}
