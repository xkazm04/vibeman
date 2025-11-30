'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Scan,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  ChevronRight,
  ChevronLeft,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useDebtPredictionStore } from '@/stores/debtPredictionStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import HealthScoreGauge from './HealthScoreGauge';
import OpportunityCard from './OpportunityCard';
import PredictionList from './PredictionList';

export default function DebtPredictionDashboard() {
  const {
    predictions,
    opportunityCards,
    stats,
    scanStatus,
    scanProgress,
    isEnabled,
    showOpportunityPanel,
    autoScanOnSave,
    fetchPredictions,
    fetchStats,
    scanProject,
    dismissPrediction,
    addressPrediction,
    escalatePrediction,
    dismissCard,
    markCardActed,
    toggleOpportunityPanel,
    setEnabled,
    setAutoScanOnSave,
  } = useDebtPredictionStore();

  const { activeProject } = useActiveProjectStore();
  const [showSettings, setShowSettings] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (activeProject?.id) {
      fetchPredictions(activeProject.id);
      fetchStats(activeProject.id);
    }
  }, [activeProject?.id]);

  const handleScan = async () => {
    if (activeProject?.id && activeProject?.path) {
      await scanProject(activeProject.id, activeProject.path);
    }
  };

  const handleCardFeedback = async (cardId: string, helpful: boolean) => {
    try {
      await fetch('/api/debt-predictions/opportunity-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          action: 'feedback',
          feedback: helpful ? 'helpful' : 'not-helpful',
        }),
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a project to view debt predictions</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10 bg-cyan-950/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Debt Prediction & Prevention
            </h1>
            <p className="text-xs text-cyan-400/60 font-mono">
              CODE HEALTH GUARDIAN
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Scan button */}
          <button
            onClick={handleScan}
            disabled={scanStatus === 'scanning'}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              transition-all duration-200
              ${
                scanStatus === 'scanning'
                  ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
                  : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30'
              }
            `}
            data-testid="scan-project-btn"
          >
            {scanStatus === 'scanning' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning... {scanProgress}%
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                Scan Project
              </>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="settings-btn"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-white/5 bg-black/20 overflow-hidden"
          >
            <div className="p-4 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/50"
                  data-testid="enable-predictions-checkbox"
                />
                <span className="text-sm text-gray-300">
                  Enable debt predictions
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScanOnSave}
                  onChange={(e) => setAutoScanOnSave(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/50"
                  data-testid="auto-scan-checkbox"
                />
                <span className="text-sm text-gray-300">
                  Auto-scan on file save
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Stats & Opportunity Cards */}
        <AnimatePresence>
          {showOpportunityPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-black/20 overflow-hidden flex flex-col"
            >
              {/* Health Score */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <HealthScoreGauge score={stats?.healthScore || 0} size="md" />
                  <div className="space-y-3">
                    {/* Quick stats */}
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-gray-400">Urgent:</span>
                      <span className="text-white font-medium">
                        {stats?.predictions.urgent || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-3 h-3 text-orange-400" />
                      <span className="text-gray-400">Accelerating:</span>
                      <span className="text-white font-medium">
                        {stats?.predictions.accelerating || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-gray-400">Addressed:</span>
                      <span className="text-white font-medium">
                        {stats?.predictions.addressed || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend summary */}
              {stats?.trends && (
                <div className="p-4 border-b border-white/5 flex justify-around text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-red-400" />
                    <span className="text-gray-400">
                      {stats.trends.filesIncreasing} rising
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-green-400" />
                    <span className="text-gray-400">
                      {stats.trends.filesDecreasing} improving
                    </span>
                  </div>
                </div>
              )}

              {/* Opportunity Cards */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Quick Actions
                  </h3>
                  <span className="text-xs text-gray-500">
                    {opportunityCards.length} available
                  </span>
                </div>

                <AnimatePresence>
                  {opportunityCards.map((card) => (
                    <OpportunityCard
                      key={card.id}
                      card={card}
                      onDismiss={dismissCard}
                      onAct={markCardActed}
                      onFeedback={handleCardFeedback}
                    />
                  ))}
                </AnimatePresence>

                {opportunityCards.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No quick actions available</p>
                    <p className="text-xs mt-1">
                      Run a scan to detect opportunities
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle panel button */}
        <button
          onClick={toggleOpportunityPanel}
          className="absolute left-[320px] top-1/2 -translate-y-1/2 z-10 p-1 bg-gray-800 border border-white/10 rounded-r-lg hover:bg-gray-700 transition-colors"
          style={{ left: showOpportunityPanel ? '320px' : '0' }}
          data-testid="toggle-opportunity-panel"
        >
          {showOpportunityPanel ? (
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Right panel - Predictions List */}
        <div className="flex-1 overflow-hidden">
          <PredictionList
            predictions={predictions}
            onDismiss={(id) => dismissPrediction(id, 'User dismissed')}
            onAddress={addressPrediction}
            onEscalate={escalatePrediction}
          />
        </div>
      </div>
    </div>
  );
}
