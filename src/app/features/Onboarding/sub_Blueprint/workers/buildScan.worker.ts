/**
 * Build Scan Web Worker
 * Offloads build scanning to a separate thread
 */

import type { WorkerRequest, WorkerResponse, BuildScanPayload } from './types';

// Since we're in a worker, we need to manually call the adapter system
// We'll need to import the necessary modules
declare const self: Worker;

self.onmessage = async (e: MessageEvent<WorkerRequest<BuildScanPayload>>) => {
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

    // Execute the build scan via API call (workers can't directly import Zustand stores)
    const response = await fetch('/api/blueprint/scans/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: payload.projectId,
        projectPath: payload.projectPath,
        projectType: payload.projectType,
        scanOnly: true,
      }),
    });

    // Report progress: fetching complete
    self.postMessage({
      type: 'progress',
      progress: 70,
    } as WorkerResponse);

    if (!response.ok) {
      throw new Error(`Build scan API failed: ${response.status}`);
    }

    const result = await response.json();

    // Report progress: parsing complete
    self.postMessage({
      type: 'progress',
      progress: 90,
    } as WorkerResponse);

    if (!result.success) {
      throw new Error(result.error || 'Build scan failed');
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
      error: error instanceof Error ? error.message : 'Build scan failed unexpectedly',
    } as WorkerResponse);
  }
};
