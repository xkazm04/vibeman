/**
 * Vision Scan Web Worker
 * Offloads vision/AI documentation scanning to a separate thread
 */

import type { WorkerRequest, WorkerResponse, VisionScanPayload } from './types';

declare const self: Worker;

self.onmessage = async (e: MessageEvent<WorkerRequest<VisionScanPayload>>) => {
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

    // Execute the vision scan via API call
    const response = await fetch('/api/projects/ai-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: payload.projectName,
        projectPath: payload.projectPath,
        projectId: payload.projectId,
        analysis: {},
        provider: payload.provider,
      }),
    });

    // Report progress: fetching complete
    self.postMessage({
      type: 'progress',
      progress: 70,
    } as WorkerResponse);

    if (!response.ok) {
      throw new Error(`Vision scan API failed: ${response.status}`);
    }

    const result = await response.json();

    // Report progress: parsing complete
    self.postMessage({
      type: 'progress',
      progress: 90,
    } as WorkerResponse);

    if (!result.success || !result.review) {
      throw new Error(result.error || 'Failed to generate documentation');
    }

    // Send success response
    self.postMessage({
      type: 'success',
      progress: 100,
      data: {
        filePath: 'context/high.md',
        content: result.review,
        projectPath: payload.projectPath,
      },
    } as WorkerResponse);
  } catch (error) {
    // Send error response
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Vision scan failed unexpectedly',
    } as WorkerResponse);
  }
};
