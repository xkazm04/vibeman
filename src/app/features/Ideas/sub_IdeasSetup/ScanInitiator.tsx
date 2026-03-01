'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronDown, Zap } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { ScanType } from '../lib/scanTypes';
import { executeClaudeIdeasWithContexts } from './lib/claudeIdeasExecutor';

// Component imports
import ClaudeIdeasButton from './components/ClaudeIdeasButton';
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
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  onScanTypesChange,
  selectedContextIds: propSelectedContextIds,
}: ScanInitiatorProps) {
  const [message, setMessage] = React.useState<string>('');

  // Generated Ideas state
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Goal-driven scan state
  const [goals, setGoals] = React.useState<GoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [isGoalScanning, setIsGoalScanning] = React.useState(false);
  const [goalDropdownOpen, setGoalDropdownOpen] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
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
      .catch(() => {});
  }, [activeProject?.id]);

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
    setMessage('Generating goal-driven scan profile...');

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

      setMessage(`Profile created: ${scanTypes.length} agents selected. Creating requirement files...`);

      // Step 2: Execute the scan using the profile configuration
      const result = await executeClaudeIdeasWithContexts({
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
      }).catch(() => {});

      if (result.success) {
        const goalTitle = goals.find(g => g.id === selectedGoalId)?.title || 'goal';
        setMessage(`${result.filesCreated} requirement files created for "${goalTitle}"! Use TaskRunner to execute.`);
        onScanComplete();
        setTimeout(() => setMessage(''), 8000);
      } else {
        setMessage(`Partial success: ${result.filesCreated} files. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Goal scan failed: ${errorMessage}`);
    } finally {
      setIsGoalScanning(false);
    }
  };

  // Generated Ideas: Create requirement files directly
  const handleGeneratedIdeasClick = async () => {
    if (!activeProject) {
      setMessage('No active project selected');
      return;
    }

    if (!activeProject.path) {
      setMessage('Project path is not defined');
      return;
    }

    setIsProcessing(true);
    setMessage('Creating Claude Code requirement files...');

    try {
      const itemCount = currentSelectedContextIds.length > 0 ? currentSelectedContextIds.length : 1;
      const expectedFiles = selectedScanTypes.length * itemCount;

      const result = await executeClaudeIdeasWithContexts({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
      });

      if (result.success) {
        setMessage(`${result.filesCreated}/${expectedFiles} requirement files created! Use TaskRunner to execute them.`);
        onScanComplete();
        setTimeout(() => setMessage(''), 8000);
      } else {
        setMessage(`Partial success: ${result.filesCreated} files created. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to create requirement files: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <div className="space-y-4">
      {/* Main Controls Row */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-4">
        {/* Status message */}
        {message && (
          <motion.div
            className="text-sm text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {message}
          </motion.div>
        )}

        {/* Scan Type Selector */}
        {onScanTypesChange && (
          <ScanTypeSelector
            selectedTypes={selectedScanTypes}
            onChange={onScanTypesChange}
          />
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/20">
          {/* Generated Ideas Button */}
          {activeProject && (
            <ClaudeIdeasButton
              onClick={handleGeneratedIdeasClick}
              disabled={isProcessing || !activeProject}
              isProcessing={isProcessing}
              scanTypesCount={selectedScanTypes.length}
              contextsCount={currentSelectedContextIds.length}
            />
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
                          <div className="text-[10px] text-gray-500 mt-0.5">Has linked context</div>
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
      </div>
    </div>
  );
}
