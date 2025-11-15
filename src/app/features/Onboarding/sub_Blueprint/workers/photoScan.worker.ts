/**
 * Photo Scan Web Worker
 * Offloads photo/screenshot scanning to a separate thread
 */

import type { WorkerRequest, WorkerResponse, PhotoScanPayload } from './types';

declare const self: Worker;

self.onmessage = async (e: MessageEvent<WorkerRequest<PhotoScanPayload>>) => {
  const { type, payload } = e.data;

  if (type !== 'scan') {
    return;
  }

  try {
    // Report progress: starting
    self.postMessage({
      type: 'progress',
      progress: 10,
    } as WorkerResponse);

    // Execute the photo scan via API call
    const response = await fetch('/api/tester/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId: payload.contextId,
        scanOnly: true,
      }),
    });

    // Report progress: fetching complete
    self.postMessage({
      type: 'progress',
      progress: 70,
    } as WorkerResponse);

    if (!response.ok) {
      throw new Error(`Photo scan API failed: ${response.status}`);
    }

    const result = await response.json();

    // Report progress: parsing complete
    self.postMessage({
      type: 'progress',
      progress: 90,
    } as WorkerResponse);

    if (!result.success) {
      throw new Error(result.error || 'Photo scan failed');
    }

    // Send success response
    self.postMessage({
      type: 'success',
      progress: 100,
      data: {
        contextId: result.contextId,
        contextName: result.contextName,
        hasScenario: result.hasScenario,
        daysAgo: result.daysAgo ?? null,
      },
    } as WorkerResponse);
  } catch (error) {
    // Send error response
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Photo scan failed unexpectedly',
    } as WorkerResponse);
  }
};
