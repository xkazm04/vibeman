/**
 * Blueprint Scans with Web Workers
 * Worker-based execution for all blueprint scans
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';
import { executeWorkerScan } from '../workers';
import type {
  BuildScanPayload,
  ContextsScanPayload,
  PhotoScanPayload,
  StructureScanPayload,
  VisionScanPayload,
} from '../workers';
import type { ScanResult as BuildScanResult } from './blueprintBuildScan';
import type { ScanResult as ContextsScanResult } from './blueprintContextsScan';
import type { ScanResult as PhotoScanResult } from './context-scans/blueprintPhotoScan';
import type { ScanResult as StructureScanResult } from './context-scans/blueprintStructureScan';
import type { ScanResult as VisionScanResult } from './blueprintVisionScan';

/**
 * Execute build scan using Web Worker
 */
export async function executeBuildScanWithWorker(
  onProgress?: (progress: number) => void
): Promise<BuildScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  const payload: BuildScanPayload = {
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type,
  };

  try {
    const data = await executeWorkerScan<BuildScanPayload, unknown>(
      'build',
      payload,
      {
        onProgress,
        onError: (error) => console.error('[BuildScan] Worker error:', error),
      }
    );

    return {
      success: true,
      data: data as any,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Build scan failed',
    };
  }
}

/**
 * Execute contexts scan using Web Worker
 */
export async function executeContextsScanWithWorker(
  onProgress?: (progress: number) => void
): Promise<ContextsScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  const payload: ContextsScanPayload = {
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type,
    provider: DefaultProviderStorage.getDefaultProvider(),
  };

  try {
    const data = await executeWorkerScan<ContextsScanPayload, unknown>(
      'contexts',
      payload,
      {
        onProgress,
        onError: (error) => console.error('[ContextsScan] Worker error:', error),
      }
    );

    return {
      success: true,
      data: data as any,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Contexts scan failed',
    };
  }
}

/**
 * Execute photo scan using Web Worker
 */
export async function executePhotoScanWithWorker(
  contextId: string,
  onProgress?: (progress: number) => void
): Promise<PhotoScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  const payload: PhotoScanPayload = {
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
  };

  try {
    const data = await executeWorkerScan<PhotoScanPayload, unknown>(
      'photo',
      payload,
      {
        onProgress,
        onError: (error) => console.error('[PhotoScan] Worker error:', error),
      }
    );

    return {
      success: true,
      data: data as any,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Photo scan failed',
    };
  }
}

/**
 * Execute structure scan using Web Worker
 */
export async function executeStructureScanWithWorker(
  onProgress?: (progress: number) => void
): Promise<StructureScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  const payload: StructureScanPayload = {
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type,
  };

  try {
    const data = await executeWorkerScan<StructureScanPayload, unknown>(
      'structure',
      payload,
      {
        onProgress,
        onError: (error) => console.error('[StructureScan] Worker error:', error),
      }
    );

    return {
      success: true,
      data: data as any,
      violations: (data as any)?.violations || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Structure scan failed',
    };
  }
}

/**
 * Execute vision scan using Web Worker
 */
export async function executeVisionScanWithWorker(
  onProgress?: (progress: number) => void
): Promise<VisionScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  const payload: VisionScanPayload = {
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectName: activeProject.name,
    provider: DefaultProviderStorage.getDefaultProvider(),
  };

  try {
    const data = await executeWorkerScan<VisionScanPayload, unknown>(
      'vision',
      payload,
      {
        onProgress,
        onError: (error) => console.error('[VisionScan] Worker error:', error),
      }
    );

    return {
      success: true,
      data: data as any,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vision scan failed',
    };
  }
}
