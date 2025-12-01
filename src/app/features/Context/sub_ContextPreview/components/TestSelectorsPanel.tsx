'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

import { TestSelector, ScanResult } from '../lib/types';
import { fetchSelectors, scanSelectors, deleteSelector } from '../lib/selectorsApi';
import { copyToClipboard } from '../lib/helpers';

import {
  SelectorsHeader,
  SelectorsError,
  SelectorsList,
  ScanResultBanner,
} from './selectors';

interface TestSelectorsPanelProps {
  contextId: string;
  groupColor: string;
  activeStepId?: string | null;
  onSelectorClick?: (testId: string) => void;
}

export default function TestSelectorsPanel({
  contextId,
  groupColor,
  activeStepId,
  onSelectorClick,
}: TestSelectorsPanelProps) {
  const { activeProject } = useActiveProjectStore();

  const [selectors, setSelectors] = useState<TestSelector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Error states
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Scan result state
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Load selectors from database
  const loadSelectors = useCallback(async () => {
    if (!contextId) {
      setLoadError('No context ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await fetchSelectors(contextId);
      setSelectors(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load selectors';
      setLoadError(message);
      console.error('[TestSelectorsPanel] Error loading selectors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contextId]);

  // Scan context files for testids
  const handleScan = useCallback(async () => {
    if (!contextId || !activeProject?.id) {
      setActionError('Missing context or project ID');
      return;
    }

    setIsScanning(true);
    setActionError(null);
    setScanResult(null);

    try {
      const result = await scanSelectors(contextId, activeProject.id);
      setScanResult(result);

      // Reload selectors to show newly added ones
      await loadSelectors();

      // Auto-dismiss scan result after 5 seconds
      setTimeout(() => setScanResult(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setActionError(message);
      console.error('[TestSelectorsPanel] Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [contextId, activeProject?.id, loadSelectors]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (testId: string, selectorId: string) => {
    setActionError(null);

    try {
      await copyToClipboard(testId);
      setCopiedId(selectorId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('[TestSelectorsPanel] Clipboard error:', err);
      setActionError('Failed to copy to clipboard');
      setTimeout(() => setActionError(null), 3000);
    }
  }, []);

  // Handle delete selector
  const handleDelete = useCallback(async (selectorId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectorId) {
      setActionError('Invalid selector ID');
      return;
    }

    if (!confirm('Delete this test selector from the database?')) {
      return;
    }

    setActionError(null);
    setDeletingId(selectorId);

    try {
      await deleteSelector(selectorId);
      // Optimistically remove from state
      setSelectors(prev => prev.filter(s => s.id !== selectorId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete selector';
      setActionError(message);
      console.error('[TestSelectorsPanel] Delete error:', err);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSelectors();
  }, [loadSelectors]);

  return (
    <div className="space-y-2">
      <SelectorsHeader
        groupColor={groupColor}
        selectorCount={selectors.length}
        isLoading={isLoading}
        isScanning={isScanning}
        onRefresh={loadSelectors}
        onScan={handleScan}
      />

      {/* Scan Result Banner */}
      {scanResult && (
        <ScanResultBanner
          result={scanResult}
          onDismiss={() => setScanResult(null)}
        />
      )}

      {/* Action Error */}
      {actionError && (
        <SelectorsError
          error={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8" data-testid="loading-selectors">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      ) : loadError ? (
        /* Load Error State */
        <div className="text-center py-4 space-y-2" data-testid="selectors-error">
          <SelectorsError
            error={loadError}
            onDismiss={() => setLoadError(null)}
            onRetry={loadSelectors}
            showRetry
          />
        </div>
      ) : (
        /* Selectors List */
        <SelectorsList
          selectors={selectors}
          activeStepId={activeStepId}
          copiedId={copiedId}
          deletingId={deletingId}
          onSelectorClick={onSelectorClick}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
