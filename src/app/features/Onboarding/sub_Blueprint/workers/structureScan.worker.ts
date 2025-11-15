/**
 * Structure Scan Web Worker
 * Offloads structure scanning to a separate thread
 */

import type { WorkerRequest, WorkerResponse, StructureScanPayload } from './types';

declare const self: Worker;

self.onmessage = async (e: MessageEvent<WorkerRequest<StructureScanPayload>>) => {
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

    // Execute the structure scan via API call
    const response = await fetch('/api/blueprint/scans/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: payload.projectId,
        projectPath: payload.projectPath,
        projectType: payload.projectType,
      }),
    });

    // Report progress: fetching complete
    self.postMessage({
      type: 'progress',
      progress: 70,
    } as WorkerResponse);

    if (!response.ok) {
      throw new Error(`Structure scan API failed: ${response.status}`);
    }

    const result = await response.json();

    // Report progress: parsing complete
    self.postMessage({
      type: 'progress',
      progress: 90,
    } as WorkerResponse);

    if (!result.success) {
      throw new Error(result.error || 'Structure scan failed');
    }

    // Send success response
    self.postMessage({
      type: 'success',
      progress: 100,
      data: result.data,
    } as WorkerResponse);
  } catch (error) {
    // Send error response
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Structure scan failed unexpectedly',
    } as WorkerResponse);
  }
};
