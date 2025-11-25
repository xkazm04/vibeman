'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Project } from '@/types';
import { runDependencyScan, fetchScanData } from './api';

/**
 * Scan types that can be executed
 */
export type ScanType = 'dependency' | 'security' | 'quality' | 'custom';

/**
 * Scan status states
 */
export type ScanStatus = 'idle' | 'running' | 'completed' | 'error';

/**
 * Progress information for a scan
 */
export interface ScanProgress {
  current: number;
  total: number;
  message?: string;
}

/**
 * Scan context value interface
 */
export interface ScanContextValue {
  // State
  scanning: boolean;
  scanStatus: ScanStatus;
  scanProgress: ScanProgress | null;
  scanError: string | null;
  selectedProjects: string[];
  scanType: ScanType;

  // Project selection
  setSelectedProjects: (projects: string[]) => void;
  toggleProject: (projectId: string) => void;
  selectAllProjects: (projects: Project[]) => void;
  clearSelection: () => void;

  // Scan control
  setScanType: (type: ScanType) => void;
  runScan: (options?: ScanOptions) => Promise<void>;
  cancelScan: () => void;
  resetScanState: () => void;

  // Progress updates
  updateProgress: (progress: ScanProgress) => void;
}

/**
 * Options for running a scan
 */
export interface ScanOptions {
  scanName?: string;
  onComplete?: (scanId: string) => void;
  onError?: (error: Error) => void;
}

const ScanContext = createContext<ScanContextValue | undefined>(undefined);

/**
 * Hook to access scan context
 */
export function useScanContext() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return context;
}

/**
 * Scan Provider Component
 */
export interface ScanProviderProps {
  children: ReactNode;
  onScanComplete?: (scanId: string) => void;
}

export function ScanProvider({ children, onScanComplete }: ScanProviderProps) {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [scanType, setScanType] = useState<ScanType>('dependency');

  /**
   * Toggle a single project selection
   */
  const toggleProject = useCallback((projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  /**
   * Select all projects
   */
  const selectAllProjects = useCallback((projects: Project[]) => {
    setSelectedProjects(projects.map(p => p.id));
  }, []);

  /**
   * Clear all project selections
   */
  const clearSelection = useCallback(() => {
    setSelectedProjects([]);
  }, []);

  /**
   * Update scan progress
   */
  const updateProgress = useCallback((progress: ScanProgress) => {
    setScanProgress(progress);
  }, []);

  /**
   * Reset scan state to initial values
   */
  const resetScanState = useCallback(() => {
    setScanning(false);
    setScanStatus('idle');
    setScanProgress(null);
    setScanError(null);
  }, []);

  /**
   * Run a scan with the selected projects
   */
  const runScan = useCallback(async (options: ScanOptions = {}) => {
    if (selectedProjects.length === 0) {
      setScanError('Please select at least one project to scan');
      return;
    }

    // Reset state
    setScanning(true);
    setScanStatus('running');
    setScanError(null);
    setScanProgress({ current: 0, total: selectedProjects.length, message: 'Initializing scan...' });

    try {
      const scanName = options.scanName || `${scanType} Scan ${new Date().toLocaleString()}`;

      // Update progress
      setScanProgress({
        current: 0,
        total: selectedProjects.length,
        message: 'Starting scan...'
      });

      // Run the dependency scan
      const result = await runDependencyScan(selectedProjects, scanName);

      // Update progress
      setScanProgress({
        current: selectedProjects.length,
        total: selectedProjects.length,
        message: 'Scan completed'
      });

      setScanStatus('completed');

      // Call completion callbacks
      if (result.scanId) {
        if (onScanComplete) {
          onScanComplete(result.scanId);
        }
        if (options.onComplete) {
          options.onComplete(result.scanId);
        }

        // Clear selection after successful scan
        setSelectedProjects([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run scan';
      setScanError(errorMessage);
      setScanStatus('error');

      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    } finally {
      setScanning(false);

      // Auto-reset progress after 2 seconds on completion
      setTimeout(() => {
        if (scanStatus === 'completed' || scanStatus === 'error') {
          setScanProgress(null);
        }
      }, 2000);
    }
  }, [selectedProjects, scanType, scanStatus, onScanComplete]);

  /**
   * Cancel an ongoing scan
   */
  const cancelScan = useCallback(() => {
    if (scanning) {
      setScanning(false);
      setScanStatus('idle');
      setScanProgress(null);
      setScanError('Scan cancelled by user');
    }
  }, [scanning]);

  const value: ScanContextValue = {
    // State
    scanning,
    scanStatus,
    scanProgress,
    scanError,
    selectedProjects,
    scanType,

    // Project selection
    setSelectedProjects,
    toggleProject,
    selectAllProjects,
    clearSelection,

    // Scan control
    setScanType,
    runScan,
    cancelScan,
    resetScanState,

    // Progress updates
    updateProgress
  };

  return (
    <ScanContext.Provider value={value}>
      {children}
    </ScanContext.Provider>
  );
}
