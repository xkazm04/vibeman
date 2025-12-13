'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  List,
  PlayCircle,
  Briefcase,
  TrendingUp,
  Calculator,
  Plus,
  RefreshCcw,
  Filter,
  Search,
} from 'lucide-react';
import { useROISimulatorStore, type SimulationViewMode } from '@/stores/roiSimulatorStore';
import { ROIDashboard, RefactoringCard, SimulationBuilder } from './components';
import {
  REFACTORING_CATEGORIES,
  STATUS_COLORS,
} from './lib/types';

interface ROISimulatorLayoutProps {
  projectId: string;
}

const VIEW_TABS: Array<{ id: SimulationViewMode; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'refactorings', label: 'Refactorings', icon: <List className="w-4 h-4" /> },
  { id: 'simulations', label: 'Simulations', icon: <PlayCircle className="w-4 h-4" /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'strategies', label: 'Strategies', icon: <Calculator className="w-4 h-4" /> },
];

export function ROISimulatorLayout({ projectId }: ROISimulatorLayoutProps) {
  const {
    viewMode,
    setViewMode,
    setSelectedProjectId,
    refactorings,
    selectedRefactoringIds,
    refactoringFilter,
    setRefactoringFilter,
    toggleRefactoringSelection,
    selectAllRefactorings,
    clearRefactoringSelection,
    getFilteredRefactorings,
    loadAll,
    isLoading,
  } = useROISimulatorStore();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSelectedProjectId(projectId);
  }, [projectId, setSelectedProjectId]);

  const filteredRefactorings = getFilteredRefactorings().filter(r =>
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950" data-testid="roi-simulator">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
                            flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ROI Simulator</h1>
                <p className="text-sm text-gray-400">Development Economics Engine</p>
              </div>
            </div>

            <button
              onClick={() => loadAll(projectId)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700
                       text-gray-300 rounded-lg transition-colors"
              data-testid="refresh-data-btn"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium
                          transition-colors ${
                  viewMode === tab.id
                    ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {viewMode === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ROIDashboard projectId={projectId} />
            </motion.div>
          )}

          {viewMode === 'refactorings' && (
            <motion.div
              key="refactorings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Filters & List */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Search & Filters */}
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search refactorings..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700
                                 rounded-lg text-white placeholder-gray-500
                                 focus:outline-none focus:border-cyan-500"
                        data-testid="search-refactorings-input"
                      />
                    </div>

                    <select
                      value={refactoringFilter.category}
                      onChange={(e) => setRefactoringFilter({ category: e.target.value as typeof refactoringFilter.category })}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                               text-white focus:outline-none focus:border-cyan-500"
                      data-testid="filter-category-select"
                    >
                      <option value="all">All Categories</option>
                      {REFACTORING_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>

                    <select
                      value={refactoringFilter.status}
                      onChange={(e) => setRefactoringFilter({ status: e.target.value as typeof refactoringFilter.status })}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                               text-white focus:outline-none focus:border-cyan-500"
                      data-testid="filter-status-select"
                    >
                      <option value="all">All Status</option>
                      {Object.keys(STATUS_COLORS).map(status => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selection Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllRefactorings}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                        data-testid="select-all-btn"
                      >
                        Select All ({filteredRefactorings.length})
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={clearRefactoringSelection}
                        className="text-sm text-gray-400 hover:text-gray-300"
                        data-testid="clear-selection-btn"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <span className="text-sm text-gray-400">
                      {selectedRefactoringIds.size} selected
                    </span>
                  </div>

                  {/* Refactoring Cards */}
                  {filteredRefactorings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
                      <List className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Refactorings Yet</h3>
                      <p className="text-gray-400 mb-4">
                        Import from Tech Debt or Ideas, or create manually.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRefactorings.map((refactoring, index) => (
                        <RefactoringCard
                          key={refactoring.id}
                          refactoring={refactoring}
                          isSelected={selectedRefactoringIds.has(refactoring.id)}
                          onToggleSelect={() => toggleRefactoringSelection(refactoring.id)}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Simulation Builder Sidebar */}
                <div className="lg:col-span-1">
                  <div className="sticky top-32">
                    <SimulationBuilder />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'simulations' && (
            <motion.div
              key="simulations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SimulationsView projectId={projectId} />
            </motion.div>
          )}

          {viewMode === 'portfolio' && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PortfolioView projectId={projectId} />
            </motion.div>
          )}

          {viewMode === 'strategies' && (
            <motion.div
              key="strategies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StrategiesView projectId={projectId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simulations View Component
function SimulationsView({ projectId }: { projectId: string }) {
  const { simulations, selectedSimulationId, selectSimulation, runSimulation, isSimulating } = useROISimulatorStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Simulations</h2>
      </div>

      {simulations.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <PlayCircle className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Simulations</h3>
          <p className="text-gray-400">Create a simulation from the Refactorings tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulations.map((sim) => (
            <motion.div
              key={sim.id}
              className={`p-4 rounded-xl border backdrop-blur-sm cursor-pointer
                        bg-gradient-to-br from-gray-800/50 to-gray-900/50
                        ${sim.id === selectedSimulationId
                          ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                          : 'border-gray-700/50 hover:border-gray-600'}`}
              onClick={() => selectSimulation(sim.id)}
              data-testid={`simulation-card-${sim.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">{sim.name}</h3>
                {sim.is_selected && (
                  <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-400">ROI</div>
                  <div className={`font-bold ${sim.overall_roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {sim.overall_roi >= 0 ? '+' : ''}{sim.overall_roi.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Break Even</div>
                  <div className="font-bold text-white">
                    {sim.break_even_month ? `Mo ${sim.break_even_month}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Cost</div>
                  <div className="font-bold text-white">
                    ${(sim.total_cost / 1000).toFixed(0)}k
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Velocity</div>
                  <div className="font-bold text-cyan-400">
                    +{sim.final_velocity_improvement.toFixed(0)}%
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runSimulation(sim.id);
                }}
                disabled={isSimulating}
                className="mt-3 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                         text-sm text-gray-300 flex items-center justify-center gap-2"
                data-testid={`rerun-simulation-${sim.id}`}
              >
                <RefreshCcw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                Re-run
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Portfolio View Component
function PortfolioView({ projectId }: { projectId: string }) {
  const {
    portfolioOptimizations,
    optimizePortfolio,
    applyPortfolio,
    selectedRefactoringIds,
    isSimulating,
  } = useROISimulatorStore();

  const [budgetHours, setBudgetHours] = useState(160);
  const [optimizationType, setOptimizationType] = useState<'max_roi' | 'max_velocity' | 'min_risk' | 'balanced' | 'pareto'>('balanced');

  const handleOptimize = async () => {
    await optimizePortfolio(optimizationType, budgetHours);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Portfolio Optimizer</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Budget (hours)</label>
            <input
              type="number"
              value={budgetHours}
              onChange={(e) => setBudgetHours(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="budget-hours-input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Optimization Goal</label>
            <select
              value={optimizationType}
              onChange={(e) => setOptimizationType(e.target.value as typeof optimizationType)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="optimization-type-select"
            >
              <option value="balanced">Balanced</option>
              <option value="max_roi">Maximize ROI</option>
              <option value="max_velocity">Maximize Velocity</option>
              <option value="min_risk">Minimize Risk</option>
              <option value="pareto">Pareto Optimal</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleOptimize}
              disabled={isSimulating}
              className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white
                       rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="optimize-portfolio-btn"
            >
              <Briefcase className="w-4 h-4" />
              Optimize
            </button>
          </div>
        </div>
      </div>

      {portfolioOptimizations.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <Briefcase className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Portfolios</h3>
          <p className="text-gray-400">Run the optimizer to generate an optimal portfolio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioOptimizations.map((portfolio) => (
            <motion.div
              key={portfolio.id}
              className="p-4 rounded-xl border border-gray-700/50 bg-gradient-to-br
                        from-gray-800/50 to-gray-900/50 backdrop-blur-sm"
              data-testid={`portfolio-card-${portfolio.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">{portfolio.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  portfolio.status === 'applied' ? 'bg-green-500/20 text-green-300' :
                  portfolio.status === 'ready' ? 'bg-cyan-500/20 text-cyan-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {portfolio.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <div className="text-gray-400">Expected ROI</div>
                  <div className="font-bold text-emerald-400">+{portfolio.expected_roi}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Hours</div>
                  <div className="font-bold text-white">{portfolio.total_allocated_hours}h</div>
                </div>
                <div>
                  <div className="text-gray-400">Velocity Gain</div>
                  <div className="font-bold text-cyan-400">+{portfolio.expected_velocity_gain}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Risk Reduction</div>
                  <div className="font-bold text-amber-400">-{portfolio.expected_risk_reduction}</div>
                </div>
              </div>

              {portfolio.status === 'ready' && (
                <button
                  onClick={() => applyPortfolio(portfolio.id)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white
                           rounded-lg transition-colors text-sm"
                  data-testid={`apply-portfolio-${portfolio.id}`}
                >
                  Apply Portfolio
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Strategies View Component
function StrategiesView({ projectId }: { projectId: string }) {
  const {
    debtStrategies,
    createStrategy,
    activateStrategy,
    selectedStrategyId,
  } = useROISimulatorStore();

  const [strategyType, setStrategyType] = useState<'snowball' | 'avalanche' | 'highest_roi' | 'highest_risk' | 'balanced'>('balanced');
  const [monthlyCapacity, setMonthlyCapacity] = useState(40);
  const [aggressiveness, setAggressiveness] = useState(0.3);

  const handleCreate = async () => {
    await createStrategy({
      strategy_type: strategyType,
      monthly_capacity_hours: monthlyCapacity,
      paydown_aggressiveness: aggressiveness,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Create Paydown Strategy</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Strategy Type</label>
            <select
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value as typeof strategyType)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="strategy-type-select"
            >
              <option value="snowball">Snowball (Quick Wins)</option>
              <option value="avalanche">Avalanche (High Impact)</option>
              <option value="highest_roi">Highest ROI</option>
              <option value="highest_risk">Highest Risk</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Monthly Capacity (h)</label>
            <input
              type="number"
              value={monthlyCapacity}
              onChange={(e) => setMonthlyCapacity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="monthly-capacity-input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Aggressiveness ({Math.round(aggressiveness * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={aggressiveness}
              onChange={(e) => setAggressiveness(parseFloat(e.target.value))}
              className="w-full"
              data-testid="aggressiveness-slider"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreate}
              className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white
                       rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="create-strategy-btn"
            >
              <Calculator className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      </div>

      {debtStrategies.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <Calculator className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Strategies</h3>
          <p className="text-gray-400">Create a strategy to plan your debt paydown.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debtStrategies.map((strategy) => (
            <motion.div
              key={strategy.id}
              className={`p-4 rounded-xl border backdrop-blur-sm
                        bg-gradient-to-br from-gray-800/50 to-gray-900/50
                        ${strategy.is_active
                          ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                          : 'border-gray-700/50'}`}
              data-testid={`strategy-card-${strategy.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">{strategy.name}</h3>
                {strategy.is_active && (
                  <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <div className="text-gray-400">Total Debt</div>
                  <div className="font-bold text-white">{strategy.total_debt_hours}h</div>
                </div>
                <div>
                  <div className="text-gray-400">Completion</div>
                  <div className="font-bold text-emerald-400">
                    {strategy.projected_completion_date
                      ? new Date(strategy.projected_completion_date).toLocaleDateString()
                      : 'TBD'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Net Rate</div>
                  <div className="font-bold text-cyan-400">{strategy.net_paydown_rate}h/mo</div>
                </div>
                <div>
                  <div className="text-gray-400">Equilibrium</div>
                  <div className="font-bold text-amber-400">{strategy.equilibrium_debt_level}h</div>
                </div>
              </div>

              {!strategy.is_active && (
                <button
                  onClick={() => activateStrategy(strategy.id)}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white
                           rounded-lg transition-colors text-sm"
                  data-testid={`activate-strategy-${strategy.id}`}
                >
                  Activate Strategy
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
