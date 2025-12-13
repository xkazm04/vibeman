'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Shield,
  Scan,
  Filter,
  Puzzle,
  ChevronRight,
  ChevronLeft,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Layers,
} from 'lucide-react';
import TechDebtCard from './TechDebtCard';
import TechDebtDetailModal from './TechDebtDetailModal';
import TechDebtStatsPanel from './TechDebtStatsPanel';
import PluginManager from './PluginManager';
import HealthScoreGauge from './HealthScoreGauge';
import OpportunityCard from './OpportunityCard';
import PredictionList from './PredictionList';
import type { DbTechDebt, TechDebtStats, TechDebtCategory, TechDebtSeverity, TechDebtStatus } from '@/app/db/models/tech-debt.types';
import type { DbDebtPrediction } from '@/app/db/models/debt-prediction.types';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { useDebtPredictionStore, type OpportunityCard as OpportunityCardType } from '@/stores/debtPredictionStore';

interface TechDebtDashboardProps {
  projectId: string;
  projectPath?: string;
}

type ViewMode = 'radar' | 'predictions' | 'combined';

interface FilterSelectProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string }[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-2">
      {label}
    </label>
    <UniversalSelect
      value={value.length > 0 ? value[0] : ''}
      onChange={(selectedValue) => {
        onChange(selectedValue ? [selectedValue] : []);
      }}
      options={options}
      variant="default"
      placeholder="Select..."
    />
  </div>
);

export default function TechDebtDashboard({ projectId, projectPath }: TechDebtDashboardProps) {
  // Radar state
  const [techDebtItems, setTechDebtItems] = useState<DbTechDebt[]>([]);
  const [stats, setStats] = useState<TechDebtStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<DbTechDebt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<TechDebtCategory[]>([]);
  const [severityFilter, setSeverityFilter] = useState<TechDebtSeverity[]>([]);
  const [statusFilter, setStatusFilter] = useState<TechDebtStatus[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<{ value: string; label: string }[]>([]);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [showOpportunityPanel, setShowOpportunityPanel] = useState(true);

  // Prediction store
  const {
    predictions,
    opportunityCards,
    stats: predictionStats,
    scanStatus,
    scanProgress,
    isEnabled,
    autoScanOnSave,
    fetchPredictions,
    fetchStats: fetchPredictionStats,
    scanProject,
    dismissPrediction,
    addressPrediction,
    escalatePrediction,
    dismissCard,
    markCardActed,
    setEnabled,
    setAutoScanOnSave,
  } = useDebtPredictionStore();

  // Load tech debt
  const loadTechDebt = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ projectId });
      if (categoryFilter.length > 0) params.set('category', categoryFilter.join(','));
      if (severityFilter.length > 0) params.set('severity', severityFilter.join(','));
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));

      const [itemsRes, statsRes] = await Promise.all([
        fetch(`/api/tech-debt?${params.toString()}`),
        fetch(`/api/tech-debt/stats?projectId=${projectId}`)
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setTechDebtItems(data.techDebt || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      // Error loading tech debt
    } finally {
      setIsLoading(false);
    }
  };

  // Load available categories (including plugin categories)
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/tech-debt/plugins/categories');
      if (res.ok) {
        const data = await res.json();
        const categories = data.categories.map((cat: { id: string; label: string }) => ({
          value: cat.id,
          label: cat.label
        }));
        setAvailableCategories(categories);
      }
    } catch (error) {
      // Fall back to default categories
      setAvailableCategories([
        { value: 'code_quality', label: 'Code Quality' },
        { value: 'security', label: 'Security' },
        { value: 'performance', label: 'Performance' },
        { value: 'maintainability', label: 'Maintainability' },
        { value: 'testing', label: 'Testing' },
        { value: 'documentation', label: 'Documentation' },
        { value: 'dependencies', label: 'Dependencies' },
        { value: 'architecture', label: 'Architecture' },
        { value: 'accessibility', label: 'Accessibility' }
      ]);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadTechDebt();
      loadCategories();
      fetchPredictions(projectId);
      fetchPredictionStats(projectId);
    }
  }, [projectId, categoryFilter, severityFilter, statusFilter]);

  // Handle plugin changes
  const handlePluginChange = () => {
    loadCategories();
    loadTechDebt();
  };

  // Run combined scan
  const runCombinedScan = async () => {
    setIsScanning(true);
    try {
      // Run tech debt radar scan
      const radarPromise = fetch('/api/tech-debt/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scanTypes: [
            'code_quality',
            'security',
            'performance',
            'testing',
            'documentation',
            'dependencies',
            'architecture',
            'maintainability',
            'accessibility'
          ],
          maxItems: 50,
          autoCreateBacklog: false
        })
      });

      // Run prediction scan if path available
      const predictionPromise = projectPath
        ? scanProject(projectId, projectPath)
        : Promise.resolve();

      await Promise.all([radarPromise, predictionPromise]);
      await loadTechDebt();
    } catch (error) {
      // Error running scan
    } finally {
      setIsScanning(false);
    }
  };

  // Create backlog item
  const handleCreateBacklog = async (techDebtId: string) => {
    try {
      const res = await fetch('/api/tech-debt/create-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techDebtId })
      });

      if (res.ok) {
        await loadTechDebt();
      }
    } catch (error) {
      // Error creating backlog item
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

  const filteredItems = techDebtItems;

  // Calculate combined health score
  const healthScore = predictionStats?.healthScore || 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500/20 to-cyan-500/20 rounded-lg">
            <Target className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tech Debt Dashboard</h1>
            <p className="text-sm text-gray-400">
              Monitor, predict, and remediate technical debt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'combined'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-combined-btn"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'radar'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-radar-btn"
            >
              <Target className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('predictions')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'predictions'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-predictions-btn"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowPlugins(!showPlugins)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg
              border transition-all ${
                showPlugins
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
              }`}
            data-testid="toggle-plugins-btn"
          >
            <Puzzle className="w-4 h-4" />
            Plugins
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg
              border transition-all ${
                showFilters
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
              }`}
            data-testid="toggle-filters-btn"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gray-700/50' : 'hover:bg-white/5'
            }`}
            data-testid="settings-btn"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={runCombinedScan}
            disabled={isScanning || scanStatus === 'scanning'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-emerald-500 to-teal-500
              hover:from-emerald-600 hover:to-teal-600
              text-white font-medium transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="run-scan-btn"
          >
            {isScanning || scanStatus === 'scanning' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning... {scanProgress > 0 ? `${scanProgress}%` : ''}
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                Run Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
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

      {/* Plugin Manager Panel */}
      <AnimatePresence>
        {showPlugins && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-700/50 overflow-hidden"
          >
            <div className="p-6">
              <PluginManager onPluginChange={handlePluginChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combined Stats Panel */}
      {(viewMode === 'combined' || viewMode === 'radar') && stats && (
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-start gap-6">
            {/* Health Score */}
            {viewMode === 'combined' && (
              <div className="flex-shrink-0">
                <HealthScoreGauge score={healthScore} size="md" />
              </div>
            )}

            {/* Stats Panel */}
            <div className="flex-1">
              <TechDebtStatsPanel stats={stats} />
            </div>

            {/* Trend Summary */}
            {viewMode === 'combined' && predictionStats?.trends && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-gray-400">Urgent:</span>
                  <span className="text-white font-medium">
                    {predictionStats.predictions?.urgent || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-orange-400" />
                  <span className="text-gray-400">Accelerating:</span>
                  <span className="text-white font-medium">
                    {predictionStats.predictions?.accelerating || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-green-400" />
                  <span className="text-gray-400">Improving:</span>
                  <span className="text-white font-medium">
                    {predictionStats.trends?.filesDecreasing || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-6 border-b border-gray-700/50 bg-gray-800/30"
        >
          <div className="grid grid-cols-3 gap-4">
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={(values) => setCategoryFilter(values as TechDebtCategory[])}
              options={availableCategories.length > 0 ? availableCategories : [
                { value: 'code_quality', label: 'Code Quality' },
                { value: 'security', label: 'Security' },
                { value: 'performance', label: 'Performance' },
                { value: 'maintainability', label: 'Maintainability' },
                { value: 'testing', label: 'Testing' },
                { value: 'documentation', label: 'Documentation' },
                { value: 'dependencies', label: 'Dependencies' },
                { value: 'architecture', label: 'Architecture' },
                { value: 'accessibility', label: 'Accessibility' }
              ]}
            />

            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={(values) => setSeverityFilter(values as TechDebtSeverity[])}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
              ]}
            />

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(values) => setStatusFilter(values as TechDebtStatus[])}
              options={[
                { value: 'detected', label: 'Detected' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'planned', label: 'Planned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'dismissed', label: 'Dismissed' }
              ]}
            />
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Opportunity Cards Panel (for combined/predictions view) */}
        <AnimatePresence>
          {(viewMode === 'combined' || viewMode === 'predictions') && showOpportunityPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-black/20 overflow-hidden flex flex-col"
            >
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
                  {opportunityCards.map((card: OpportunityCardType) => (
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
        {(viewMode === 'combined' || viewMode === 'predictions') && (
          <button
            onClick={() => setShowOpportunityPanel(!showOpportunityPanel)}
            className="absolute z-10 p-1 bg-gray-800 border border-white/10 rounded-r-lg hover:bg-gray-700 transition-colors"
            style={{
              left: showOpportunityPanel ? '320px' : '0',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            data-testid="toggle-opportunity-panel"
          >
            {showOpportunityPanel ? (
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Predictions List (for combined/predictions view) */}
          {(viewMode === 'combined' || viewMode === 'predictions') && (
            <div className={`${viewMode === 'combined' ? 'h-1/2 border-b border-gray-700/50' : 'flex-1'} overflow-hidden`}>
              <PredictionList
                predictions={predictions}
                onDismiss={(id) => dismissPrediction(id, 'User dismissed')}
                onAddress={addressPrediction}
                onEscalate={escalatePrediction}
              />
            </div>
          )}

          {/* Tech Debt Grid (for combined/radar view) */}
          {(viewMode === 'combined' || viewMode === 'radar') && (
            <div className={`${viewMode === 'combined' ? 'h-1/2' : 'flex-1'} overflow-y-auto p-6`}>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading tech debt...</div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Target className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No technical debt found</p>
                  <p className="text-sm">Run a scan to detect issues</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <TechDebtCard
                      key={item.id}
                      techDebt={item}
                      onSelect={() => setSelectedItem(item)}
                      onCreateBacklog={() => handleCreateBacklog(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <TechDebtDetailModal
          techDebt={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={loadTechDebt}
        />
      )}
    </div>
  );
}
