'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, Zap, X, AlertTriangle, Loader2, Search, Eye } from 'lucide-react';
import { Youtube } from '@/components/icons/brand-icons';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { toast } from '@/stores/messageStore';
import { ScanType } from '../lib/scanTypes';
import { executeClaudeCodeScan } from './lib/ideaExecutor';
import {
  buildScanQueueRequests,
  enqueueDbScans,
  pollScanQueueUntilDone,
} from './lib/dbScanQueue';

// Component imports
import ClaudeIdeasButton, { DetailedIdeasButton } from './components/ClaudeIdeasButton';
import ScanTypeSelector from './ScanTypeSelector';

interface GoalOption {
  id: string;
  title: string;
  context_id: string | null;
  status: string;
}

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
  onScanTypesChange?: (types: ScanType[]) => void;
  selectedContextIds: string[];
  selectedGroupIds?: string[];
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  onScanTypesChange,
  selectedContextIds: propSelectedContextIds,
  selectedGroupIds: propSelectedGroupIds = [],
}: ScanInitiatorProps) {
  // Generated Ideas state
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isDetailedProcessing, setIsDetailedProcessing] = React.useState(false);
  // Primary DB-idea scan state (queue → worker → visible cards)
  const [isDbScanning, setIsDbScanning] = React.useState(false);
  // Per-run auto-merge toggle — default OFF. When on, the worker auto-accepts
  // ideas in the honest high-impact/low-effort band (impact ≥ 8 and effort ≤ 3).
  const [autoMergeEnabled, setAutoMergeEnabled] = React.useState(false);
  // Opt-in file-watch toggle — default OFF. When on, a chokidar watcher on the
  // project auto-enqueues a scan whenever files change; the round-1 content-hash
  // drift gate skips unchanged contexts near-free, so this never runs auto-merge.
  const [fileWatchEnabled, setFileWatchEnabled] = React.useState(false);
  const [fileWatchBusy, setFileWatchBusy] = React.useState(false);

  // Scan progress state — drives the progress bar + "agent × context" ticker
  interface ScanProgress {
    done: number;
    total: number;
    currentLabel: string;
    errors: number;
  }
  const [scanProgress, setScanProgress] = React.useState<ScanProgress | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelScan = React.useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  React.useEffect(() => {
    // Abort any in-flight scan if the component unmounts.
    return () => abortControllerRef.current?.abort();
  }, []);

  // YouTube Scout state
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const isYoutubeSelected = selectedScanTypes.includes('youtube_scout');
  const isYoutubeValid = !isYoutubeSelected || youtubeUrl.trim().length > 0;

  // Goal-driven scan state
  const [goals, setGoals] = React.useState<GoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [isGoalScanning, setIsGoalScanning] = React.useState(false);
  const [goalDropdownOpen, setGoalDropdownOpen] = React.useState(false);

  const { activeProject } = useClientProjectStore();
  const goalDropdownRef = React.useRef<HTMLDivElement>(null);

  // Load goals for the active project
  React.useEffect(() => {
    if (!activeProject?.id) return;
    fetch(`/api/goals?projectId=${activeProject.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.goals) {
          const openGoals = (data.goals as GoalOption[]).filter(
            g => g.status === 'open' || g.status === 'in_progress',
          );
          setGoals(openGoals);
        }
      })
      .catch((error) => { console.error('[ScanInitiator] Failed to load goals:', error); });
  }, [activeProject?.id]);

  // Reflect the persisted file-watch config for the active project.
  React.useEffect(() => {
    if (!activeProject?.id) {
      setFileWatchEnabled(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/file-watch?projectId=${activeProject.id}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setFileWatchEnabled(data?.config?.enabled === 1);
      })
      .catch((error) => { console.error('[ScanInitiator] Failed to load file-watch config:', error); });
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  // Opt-in file-watch toggle: upsert file_watch_config with sensible defaults.
  // The watcher enqueues normal scans (force=false) — cost control is the drift
  // gate — and NEVER enables auto-merge.
  const handleToggleFileWatch = async () => {
    if (!activeProject) {
      toast.error('No active project', 'Please select a project first');
      return;
    }
    const next = !fileWatchEnabled;
    const dbScanTypes = selectedScanTypes.filter(t => t !== 'youtube_scout');
    const watchScanTypes = dbScanTypes.length > 0 ? dbScanTypes : ['bug_hunter'];

    setFileWatchBusy(true);
    try {
      const res = await fetch('/api/file-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          enabled: next,
          watchPatterns: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
          scanTypes: watchScanTypes,
          debounceMs: 5000,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      setFileWatchEnabled(next);
      toast.success(
        next ? 'File watch on' : 'File watch off',
        next
          ? 'Scans will auto-run when source files change (unchanged contexts are skipped).'
          : 'File-change scans disabled for this project.',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('File watch failed', errorMessage);
    } finally {
      setFileWatchBusy(false);
    }
  };

  // Close goal dropdown on click-outside or Escape
  React.useEffect(() => {
    if (!goalDropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(e.target as Node)) {
        setGoalDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGoalDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goalDropdownOpen]);

  // Use prop selected context IDs directly - context loading is handled by IdeasHeaderWithFilter
  const currentSelectedContextIds = propSelectedContextIds;

  // Goal-Driven Scan: auto-generate profile and execute
  const handleGoalScan = async () => {
    if (!activeProject || !activeProject.path || !selectedGoalId) return;

    setIsGoalScanning(true);
    toast.info('Goal scan', 'Generating goal-driven scan profile...');

    try {
      // Step 1: Auto-generate scan profile from goal
      const profileRes = await fetch('/api/scan-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          goalId: selectedGoalId,
          autoGenerate: true,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileData.success) {
        throw new Error(profileData.error || 'Failed to generate scan profile');
      }

      const profile = profileData.data;
      const scanTypes = JSON.parse(profile.scan_types) as ScanType[];
      const contextIds = profile.context_ids ? JSON.parse(profile.context_ids) as string[] : [];

      toast.info('Goal scan', `Profile created: ${scanTypes.length} agents selected. Creating requirement files...`);

      // Step 2: Execute the scan using the profile configuration
      const result = await executeClaudeCodeScan({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes,
        contextIds,
        goalId: selectedGoalId,
      });

      // Step 3: Record the run
      await fetch('/api/scan-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, recordRun: true }),
      }).catch((error) => { console.error('[ScanInitiator] Failed to record scan profile run:', error); });

      if (result.success) {
        const goalTitle = goals.find(g => g.id === selectedGoalId)?.title || 'goal';
        toast.success('Goal scan complete', `${result.itemCount} requirement files created for "${goalTitle}"! Use TaskRunner to execute.`);
        onScanComplete();
      } else {
        toast.warning('Goal scan partial', `${result.itemCount} files created. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Goal scan failed', errorMessage);
    } finally {
      setIsGoalScanning(false);
    }
  };

  // Primary scan: enqueue DB-idea scans so results appear as cards on-screen.
  // Routes through the scan QUEUE (worker → generateIdeas → ideas rows), unlike
  // the requirement-file path below which produces no cards.
  const handleDbScanClick = async () => {
    if (!activeProject) {
      toast.error('No active project', 'Please select a project first');
      return;
    }

    // The DB-idea path analyzes code; youtube_scout belongs to the
    // requirement-file path, so exclude it here.
    const dbScanTypes = selectedScanTypes.filter(t => t !== 'youtube_scout');
    if (dbScanTypes.length === 0) {
      toast.warning('No scannable types', 'Select at least one code scan type. YouTube Scout runs via "Requirement files".');
      return;
    }

    const requests = buildScanQueueRequests(dbScanTypes, currentSelectedContextIds);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDbScanning(true);
    setScanProgress({ done: 0, total: requests.length, currentLabel: '', errors: 0 });
    toast.info('Scanning', `Queued ${requests.length} scan${requests.length === 1 ? '' : 's'} — ideas will appear as they complete.`);

    try {
      const enqueuedIds = await enqueueDbScans({
        projectId: activeProject.id,
        requests,
        autoMergeEnabled,
        signal: controller.signal,
      });

      const { errors, completed } = await pollScanQueueUntilDone({
        projectId: activeProject.id,
        enqueuedIds,
        signal: controller.signal,
        onProgress: (p) => setScanProgress(p),
      });

      // New idea rows exist regardless of per-scan errors — refresh the cards.
      onScanComplete();

      if (!completed || controller.signal.aborted) {
        toast.warning('Scan stopped', 'Scan monitoring stopped — any completed ideas are shown below.');
      } else if (errors > 0) {
        toast.warning('Scan finished with errors', `${enqueuedIds.length - errors}/${enqueuedIds.length} scans succeeded. New ideas are shown below.`);
      } else {
        toast.success('Scan complete', `${enqueuedIds.length} scan${enqueuedIds.length === 1 ? '' : 's'} finished — new ideas are shown below.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Scan failed', errorMessage);
    } finally {
      setIsDbScanning(false);
      setScanProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Generated Ideas: Create requirement files directly
  const handleGeneratedIdeasClick = async () => {
    if (!activeProject) {
      toast.error('No active project', 'Please select a project first');
      return;
    }

    if (!activeProject.path) {
      toast.error('Missing project path', 'Project path is not defined');
      return;
    }

    const itemCount = currentSelectedContextIds.length > 0
      ? currentSelectedContextIds.length
      : propSelectedGroupIds.length > 0
        ? propSelectedGroupIds.length
        : 1;
    const expectedFiles = selectedScanTypes.length * itemCount;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);
    setScanProgress({ done: 0, total: expectedFiles, currentLabel: '', errors: 0 });
    toast.info('Creating files', 'Creating Claude Code requirement files...');

    try {
      const result = await executeClaudeCodeScan({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
        groupIds: propSelectedGroupIds,
        youtubeUrl: isYoutubeSelected ? youtubeUrl.trim() : undefined,
        signal: controller.signal,
        onProgress: (done, total, currentLabel, status) =>
          setScanProgress(prev => ({
            done,
            total,
            currentLabel,
            errors: (prev?.errors ?? 0) + (status === 'error' ? 1 : 0),
          })),
      });

      if (controller.signal.aborted) {
        toast.warning('Scan cancelled', `${result.itemCount}/${expectedFiles} requirement files created before cancel.`);
        if (result.itemCount > 0) onScanComplete();
      } else if (result.success) {
        toast.success('Files created', `${result.itemCount}/${expectedFiles} requirement files created! Use TaskRunner to execute them.`);
        onScanComplete();
      } else {
        toast.error('Creation failed', `${result.itemCount} files created. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Creation failed', errorMessage);
    } finally {
      setIsProcessing(false);
      setScanProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Detailed Ideas: Create requirement files with implementation procedures
  const handleDetailedScanClick = async () => {
    if (!activeProject) {
      toast.error('No active project', 'Please select a project first');
      return;
    }

    if (!activeProject.path) {
      toast.error('Missing project path', 'Project path is not defined');
      return;
    }

    const itemCount = currentSelectedContextIds.length > 0
      ? currentSelectedContextIds.length
      : propSelectedGroupIds.length > 0
        ? propSelectedGroupIds.length
        : 1;
    const expectedFiles = selectedScanTypes.length * itemCount;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDetailedProcessing(true);
    setScanProgress({ done: 0, total: expectedFiles, currentLabel: '', errors: 0 });
    toast.info('Creating files', 'Creating detailed requirement files with implementation procedures...');

    try {
      const result = await executeClaudeCodeScan({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
        groupIds: propSelectedGroupIds,
        detailed: true,
        youtubeUrl: isYoutubeSelected ? youtubeUrl.trim() : undefined,
        signal: controller.signal,
        onProgress: (done, total, currentLabel, status) =>
          setScanProgress(prev => ({
            done,
            total,
            currentLabel,
            errors: (prev?.errors ?? 0) + (status === 'error' ? 1 : 0),
          })),
      });

      if (controller.signal.aborted) {
        toast.warning('Scan cancelled', `${result.itemCount}/${expectedFiles} detailed requirement files created before cancel.`);
        if (result.itemCount > 0) onScanComplete();
      } else if (result.success) {
        toast.success('Files created', `${result.itemCount}/${expectedFiles} detailed requirement files created! Use TaskRunner to execute them.`);
        onScanComplete();
      } else {
        toast.error('Creation failed', `${result.itemCount} detailed files created. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Creation failed', errorMessage);
    } finally {
      setIsDetailedProcessing(false);
      setScanProgress(null);
      abortControllerRef.current = null;
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <div className="space-y-4">
      {/* Main Controls Row */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-4">
        {/* Scan Type Selector */}
        {onScanTypesChange && (
          <ScanTypeSelector
            selectedTypes={selectedScanTypes}
            onChange={onScanTypesChange}
          />
        )}

        {/* YouTube URL Input — shown when youtube_scout is selected */}
        {isYoutubeSelected && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-600/40 bg-red-950/20">
            <Youtube className="w-4 h-4 text-red-400 shrink-0" />
            <input
              type="url"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-sm text-red-100 placeholder-red-700/60 outline-none min-w-0 w-64"
            />
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/20 flex-wrap">
          {/* Primary: DB-idea scan — produces cards on-screen */}
          {activeProject && (
            <motion.button
              onClick={handleDbScanClick}
              disabled={isDbScanning || isProcessing || isDetailedProcessing || !activeProject || selectedScanTypes.length === 0}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
                isDbScanning
                  ? 'bg-emerald-500/30 border-emerald-500/50'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 hover:border-emerald-500/60'
              } ${(isDbScanning || isProcessing || isDetailedProcessing || selectedScanTypes.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={!isDbScanning && selectedScanTypes.length > 0 ? { scale: 1.05 } : {}}
              whileTap={!isDbScanning && selectedScanTypes.length > 0 ? { scale: 0.95 } : {}}
              title="Scan the codebase and add ideas directly to the board below"
              data-testid="db-scan-btn"
            >
              {isDbScanning ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
              ) : (
                <Search className="w-4 h-4 text-emerald-300" />
              )}
              <span className="text-white">
                {isDbScanning ? 'Scanning...' : 'Scan ideas'}
              </span>
            </motion.button>
          )}

          {/* Per-run auto-merge toggle — default OFF. Honest label: the band is
              a real "high impact, low effort" range, not a vague promise. */}
          {activeProject && (
            <button
              type="button"
              role="switch"
              aria-checked={autoMergeEnabled}
              onClick={() => setAutoMergeEnabled(v => !v)}
              disabled={isDbScanning}
              title="Auto-accept ideas with impact ≥ 8 and effort ≤ 3 as soon as this scan finishes"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                autoMergeEnabled
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-gray-700/40 bg-gray-800/40 text-gray-400 hover:text-gray-200'
              } ${isDbScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="auto-merge-toggle"
            >
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  autoMergeEnabled ? 'bg-emerald-500/70' : 'bg-gray-600/60'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autoMergeEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span className="whitespace-nowrap">Auto-merge (impact ≥ 8, effort ≤ 3)</span>
            </button>
          )}

          {/* Opt-in file-watch toggle — default OFF. Persists file_watch_config;
              the boot hook rehydrates it after a restart. Never enables auto-merge. */}
          {activeProject && (
            <button
              type="button"
              role="switch"
              aria-checked={fileWatchEnabled}
              onClick={handleToggleFileWatch}
              disabled={fileWatchBusy}
              title="Auto-run scans when source files change. Unchanged contexts are skipped by the content-hash drift gate."
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                fileWatchEnabled
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-gray-700/40 bg-gray-800/40 text-gray-400 hover:text-gray-200'
              } ${fileWatchBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="file-watch-toggle"
            >
              {fileWatchBusy ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
              ) : (
                <Eye className="w-4 h-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">Watch files</span>
            </button>
          )}

          {/* Secondary: requirement-file generation (no cards; run via TaskRunner) */}
          {activeProject && (
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-gray-700/30">
              <span className="text-2xs uppercase tracking-wide text-gray-500 select-none">Requirement files</span>
              <ClaudeIdeasButton
                onClick={handleGeneratedIdeasClick}
                disabled={isProcessing || isDetailedProcessing || isDbScanning || !activeProject || !isYoutubeValid}
                isProcessing={isProcessing}
                scanTypesCount={selectedScanTypes.length}
                contextsCount={currentSelectedContextIds.length}
              />
              <DetailedIdeasButton
                onClick={handleDetailedScanClick}
                disabled={isDetailedProcessing || isProcessing || isDbScanning || !activeProject || !isYoutubeValid}
                isProcessing={isDetailedProcessing}
                scanTypesCount={selectedScanTypes.length}
                contextsCount={currentSelectedContextIds.length}
              />
            </div>
          )}

          {/* Goal-Driven Scan */}
          {activeProject && goals.length > 0 && (
            <div className="flex items-center gap-2 relative">
              {/* Goal Selector Dropdown */}
              <div ref={goalDropdownRef} className="relative">
                <button
                  onClick={() => setGoalDropdownOpen(!goalDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm transition-colors"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="max-w-[140px] truncate">
                    {selectedGoal ? selectedGoal.title : 'Select Goal'}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${goalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {goalDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {goals.map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => {
                          setSelectedGoalId(goal.id);
                          setGoalDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700/50 transition-colors ${
                          selectedGoalId === goal.id ? 'bg-amber-500/10 text-amber-300' : 'text-gray-300'
                        }`}
                      >
                        <div className="truncate">{goal.title}</div>
                        {goal.context_id && (
                          <div className="text-2xs text-gray-500 mt-0.5">Has linked context</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scan for Goal Button */}
              <motion.button
                onClick={handleGoalScan}
                disabled={!selectedGoalId || isGoalScanning || isProcessing}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border font-semibold text-sm transition-all ${
                  selectedGoalId
                    ? 'border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200'
                    : 'border-gray-600/40 bg-gray-700/20 text-gray-500 cursor-not-allowed'
                }`}
                whileHover={selectedGoalId && !isGoalScanning ? { scale: 1.03 } : {}}
                whileTap={selectedGoalId && !isGoalScanning ? { scale: 0.97 } : {}}
              >
                <Zap className={`w-3.5 h-3.5 ${isGoalScanning ? 'animate-pulse' : ''}`} />
                {isGoalScanning ? 'Scanning...' : 'Scan for Goal'}
              </motion.button>
            </div>
          )}
        </div>

        {/* Scan Progress — bar + "agent × context" ticker + Cancel */}
        <AnimatePresence>
          {scanProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-gray-700/20 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2 text-2xs text-gray-400">
                    <span className="font-mono tabular-nums text-gray-300">
                      {scanProgress.done}/{scanProgress.total}
                    </span>
                    {scanProgress.currentLabel && (
                      <span className="truncate text-gray-500" title={scanProgress.currentLabel}>
                        {scanProgress.currentLabel}
                      </span>
                    )}
                    {scanProgress.errors > 0 && (
                      <span className="flex items-center gap-1 text-red-400 flex-shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        {scanProgress.errors}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCancelScan}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-2xs transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
                    title="Cancel scan"
                    aria-label="Cancel scan"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-700/40 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${scanProgress.total > 0 ? (scanProgress.done / scanProgress.total) * 100 : 0}%`,
                    }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
