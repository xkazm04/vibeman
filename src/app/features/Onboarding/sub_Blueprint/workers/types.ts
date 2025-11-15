/**
 * Shared types for Blueprint Web Workers
 */

export interface WorkerRequest<T = unknown> {
  type: 'scan';
  payload: T;
}

export interface WorkerResponse<T = unknown> {
  type: 'progress' | 'success' | 'error';
  progress?: number;
  data?: T;
  error?: string;
}

// Scan-specific request payloads
export interface BuildScanPayload {
  projectId: string;
  projectPath: string;
  projectType?: string;
}

export interface ContextsScanPayload {
  projectId: string;
  projectPath: string;
  projectType?: string;
  provider?: string;
}

export interface PhotoScanPayload {
  projectId: string;
  projectPath: string;
  contextId: string;
}

export interface StructureScanPayload {
  projectId: string;
  projectPath: string;
  projectType?: string;
}

export interface VisionScanPayload {
  projectId: string;
  projectPath: string;
  projectName: string;
  provider?: string;
}
