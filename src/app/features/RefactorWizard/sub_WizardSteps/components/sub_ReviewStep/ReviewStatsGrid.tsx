'use client';

import { Layers, FileCode, AlertTriangle, CheckSquare } from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';

/**
 * Props for ReviewStatsGrid component
 */
export interface ReviewStatsGridProps {
  stats: {
    total: number;
    fileCount: number;
    critical: number;
    high: number;
  };
  selectedCount: number;
}

/**
 * ReviewStatsGrid - Displays statistics cards for the ReviewStep
 * 
 * Shows four stat cards:
 * - Total Issues
 * - Files Affected
 * - High Priority (critical + high)
 * - Selected count
 */
export function ReviewStatsGrid({ stats, selectedCount }: ReviewStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <CyberCard variant="dark" className="!p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total Issues</p>
          </div>
        </div>
      </CyberCard>

      <CyberCard variant="dark" className="!p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FileCode className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.fileCount}</p>
            <p className="text-xs text-gray-400">Files Affected</p>
          </div>
        </div>
      </CyberCard>

      <CyberCard variant="dark" className="!p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.critical + stats.high}</p>
            <p className="text-xs text-gray-400">High Priority</p>
          </div>
        </div>
      </CyberCard>

      <CyberCard variant="dark" className="!p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckSquare className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{selectedCount}</p>
            <p className="text-xs text-gray-400">Selected</p>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
