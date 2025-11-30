'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  GitBranch,
  TrendingUp,
} from 'lucide-react';
import CyberCard from '@/components/ui/wizard/CyberCard';
import StatCard from '@/components/ui/wizard/StatCard';
import RiskScoreGauge from './components/RiskScoreGauge';
import VulnerabilityBreakdown from './components/VulnerabilityBreakdown';
import AlertsList from './components/AlertsList';
import StaleBranchesPanel from './components/StaleBranchesPanel';
import ProjectSecurityCard from './components/ProjectSecurityCard';
import {
  fetchDashboardSummary,
  fetchStaleBranches,
  acknowledgeAlert,
  resolveAlert,
  autoCloseBranch,
  preserveBranch,
} from './lib/securityApi';
import type {
  SecurityDashboardSummary,
  SecurityAlert,
  StaleBranch,
} from '@/app/db/models/security-intelligence.types';

/**
 * SecurityIntelligenceLayout - Main dashboard component
 *
 * Features:
 * - Cross-project security overview
 * - Real-time vulnerability aggregation
 * - Predictive risk scores
 * - Alert management
 * - Stale branch auto-close
 */
export default function SecurityIntelligenceLayout() {
  const [summary, setSummary] = useState<SecurityDashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [staleBranches, setStaleBranches] = useState<StaleBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'branches'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, branchesData] = await Promise.all([
        fetchDashboardSummary(true),
        fetchStaleBranches(undefined, true),
      ]);

      setSummary(dashboardData.summary);
      setAlerts(dashboardData.pendingAlerts || []);
      setStaleBranches(branchesData.branches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleAutoClose = async (id: string) => {
    const branch = staleBranches.find((b) => b.id === id);
    if (!branch) return;

    // Get project path from summary
    const project = summary?.projects.find((p) => p.projectId === branch.projectId);
    if (!project) throw new Error('Project not found');

    await autoCloseBranch(id, project.projectPath);
    setStaleBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const handlePreserve = async (id: string) => {
    await preserveBranch(id);
    setStaleBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, manuallyPreserved: true } : b))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="security-loading">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-400" data-testid="security-error">
        <AlertTriangle className="w-12 h-12 mb-3" />
        <p>{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
          data-testid="security-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-6 space-y-6" data-testid="security-intelligence-layout">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white">Security Intelligence</h1>
            <p className="text-sm text-gray-400">
              Cross-project vulnerability monitoring and risk assessment
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          data-testid="security-refresh-btn"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <CyberCard data-testid="security-summary-card">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <StatCard
            label="Total Projects"
            value={summary.totalProjects}
            icon={Shield}
            variant="info"
          />
          <StatCard
            label="At Risk"
            value={summary.projectsAtRisk}
            icon={AlertTriangle}
            variant={summary.projectsAtRisk > 0 ? 'error' : 'success'}
          />
          <StatCard
            label="Total Vulnerabilities"
            value={summary.totalVulnerabilities}
            icon={AlertTriangle}
            variant={summary.totalVulnerabilities > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="CI Passing"
            value={`${summary.ciPassingCount}/${summary.totalProjects}`}
            icon={summary.ciPassingCount === summary.totalProjects ? CheckCircle : XCircle}
            variant={summary.ciPassingCount === summary.totalProjects ? 'success' : 'warning'}
          />
          <StatCard
            label="Pending Alerts"
            value={summary.pendingAlerts}
            icon={AlertTriangle}
            variant={summary.pendingAlerts > 0 ? 'error' : 'success'}
          />
        </div>
      </CyberCard>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(['overview', 'alerts', 'branches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm transition-colors ${
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            data-testid={`security-tab-${tab}`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'alerts' && `Alerts (${alerts.length})`}
            {tab === 'branches' && `Stale Branches (${staleBranches.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Risk & Vulnerabilities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Aggregate Risk */}
              <CyberCard data-testid="aggregate-risk-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">Aggregate Risk Score</h2>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex items-center justify-center">
                  <RiskScoreGauge
                    score={Math.round(summary.averageRiskScore)}
                    size="lg"
                    trend={
                      summary.averageRiskScore > 70 ? 'degrading' :
                      summary.averageRiskScore < 30 ? 'improving' : 'stable'
                    }
                  />
                </div>
              </CyberCard>

              {/* Vulnerability Summary */}
              <CyberCard data-testid="vulnerability-summary-card">
                <h2 className="text-lg font-medium text-white mb-4">Vulnerability Summary</h2>
                <VulnerabilityBreakdown
                  critical={summary.criticalVulnerabilities}
                  high={summary.projects.reduce((acc, p) => acc + p.highCount, 0)}
                  medium={summary.projects.reduce((acc, p) => acc + p.mediumCount, 0)}
                  low={summary.projects.reduce((acc, p) => acc + p.lowCount, 0)}
                />
              </CyberCard>

              {/* Project Cards */}
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Projects by Risk</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.projects
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map((project) => (
                      <ProjectSecurityCard key={project.projectId} intelligence={project} />
                    ))}
                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              {/* Quick Alerts */}
              <CyberCard data-testid="quick-alerts-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">Recent Alerts</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                    {alerts.length}
                  </span>
                </div>
                <AlertsList
                  alerts={alerts.slice(0, 5)}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  maxItems={5}
                />
              </CyberCard>

              {/* Stale Branches Quick View */}
              <CyberCard data-testid="quick-branches-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">Stale Branches</h2>
                  <GitBranch className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  {staleBranches.slice(0, 3).map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <span className="text-sm text-white truncate max-w-[150px]">
                        {branch.branchName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {branch.daysStale}d
                      </span>
                    </div>
                  ))}
                  {staleBranches.length > 3 && (
                    <button
                      onClick={() => setActiveTab('branches')}
                      className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-2"
                      data-testid="view-all-branches-btn"
                    >
                      View all {staleBranches.length} branches
                    </button>
                  )}
                </div>
              </CyberCard>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <CyberCard data-testid="alerts-panel">
            <h2 className="text-lg font-medium text-white mb-4">Security Alerts</h2>
            <AlertsList
              alerts={alerts}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              maxItems={50}
            />
          </CyberCard>
        )}

        {activeTab === 'branches' && (
          <CyberCard data-testid="branches-panel">
            <h2 className="text-lg font-medium text-white mb-4">Stale Branches</h2>
            <StaleBranchesPanel
              branches={staleBranches}
              onAutoClose={handleAutoClose}
              onPreserve={handlePreserve}
            />
          </CyberCard>
        )}
      </motion.div>
    </div>
  );
}
