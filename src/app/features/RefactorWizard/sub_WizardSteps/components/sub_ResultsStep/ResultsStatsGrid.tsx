'use client';

import { Package, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/ui/wizard';

export interface ResultsStatsGridProps {
  packageCount: number;
  totalIssues: number;
  totalFiles: number;
  foundationalPackages: number;
}

/**
 * ResultsStatsGrid - Displays the stats grid with key metrics.
 * 
 * Shows four stat cards:
 * - Strategic Packages: Number of packages created
 * - Total Issues: Sum of issues across all packages
 * - Files Affected: Number of unique files affected
 * - Foundational: Number of packages with no dependencies
 */
export function ResultsStatsGrid({
  packageCount,
  totalIssues,
  totalFiles,
  foundationalPackages,
}: ResultsStatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3" data-testid="results-stats-grid">
      <StatCard
        label="Strategic Packages"
        value={packageCount}
        icon={Package}
        variant="success"
      />
      <StatCard
        label="Total Issues"
        value={totalIssues}
        icon={AlertCircle}
        variant="info"
      />
      <StatCard
        label="Files Affected"
        value={totalFiles}
        icon={FileText}
        variant="info"
      />
      <StatCard
        label="Foundational"
        value={foundationalPackages}
        icon={Sparkles}
        variant="info"
      />
    </div>
  );
}
