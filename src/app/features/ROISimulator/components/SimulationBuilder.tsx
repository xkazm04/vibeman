'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Plus,
  Settings,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Target,
  RefreshCcw,
} from 'lucide-react';
import { useROISimulatorStore } from '@/stores/roiSimulatorStore';
import { SIMULATION_TYPE_LABELS, formatCurrency } from '../lib/types';

export function SimulationBuilder() {
  const {
    simulationBuilder,
    updateSimulationBuilder,
    selectedRefactoringIds,
    refactorings,
    createSimulation,
    runSimulation,
    isSimulating,
  } = useROISimulatorStore();

  const [isCreating, setIsCreating] = useState(false);

  const selectedCost = refactorings
    .filter(r => selectedRefactoringIds.has(r.id))
    .reduce((sum, r) => sum + r.calculated_cost, 0);

  const selectedBenefit = refactorings
    .filter(r => selectedRefactoringIds.has(r.id))
    .reduce((sum, r) => sum + r.calculated_benefit, 0);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const simulation = await createSimulation();
      if (simulation) {
        await runSimulation(simulation.id);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                rounded-xl border border-gray-700/50 p-6"
      data-testid="simulation-builder"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Create Simulation</h3>
          <p className="text-sm text-gray-400">Model ROI before executing refactorings</p>
        </div>
      </div>

      {/* Selection Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">{selectedRefactoringIds.size}</div>
          <div className="text-xs text-gray-400">Selected</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{formatCurrency(selectedCost)}</div>
          <div className="text-xs text-gray-400">Cost</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedBenefit)}</div>
          <div className="text-xs text-gray-400">Benefit</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Simulation Name</label>
          <input
            type="text"
            value={simulationBuilder.name}
            onChange={(e) => updateSimulationBuilder({ name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            placeholder="e.g., Q1 Refactoring Plan"
            data-testid="simulation-name-input"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Simulation Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(SIMULATION_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => updateSimulationBuilder({ type: value as typeof simulationBuilder.type })}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  simulationBuilder.type === value
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 border'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white border'
                }`}
                data-testid={`simulation-type-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4" />
              Time Horizon (months)
            </label>
            <input
              type="number"
              value={simulationBuilder.timeHorizon}
              onChange={(e) => updateSimulationBuilder({ timeHorizon: parseInt(e.target.value) || 12 })}
              min={1}
              max={36}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="simulation-horizon-input"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" />
              Team Size
            </label>
            <input
              type="number"
              value={simulationBuilder.teamSize}
              onChange={(e) => updateSimulationBuilder({ teamSize: parseInt(e.target.value) || 1 })}
              min={1}
              max={100}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="simulation-team-input"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" />
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={simulationBuilder.hourlyRate}
              onChange={(e) => updateSimulationBuilder({ hourlyRate: parseInt(e.target.value) || 100 })}
              min={1}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-cyan-500"
              data-testid="simulation-rate-input"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
          <textarea
            value={simulationBuilder.description}
            onChange={(e) => updateSimulationBuilder({ description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
            placeholder="Notes about this simulation scenario..."
            data-testid="simulation-description-input"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isCreating || isSimulating || selectedRefactoringIds.size === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                   bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed
                   text-white font-medium transition-colors"
          data-testid="create-simulation-btn"
        >
          {isCreating || isSimulating ? (
            <>
              <RefreshCcw className="w-5 h-5 animate-spin" />
              Running Simulation...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Create & Run Simulation
            </>
          )}
        </button>

        {selectedRefactoringIds.size === 0 && (
          <p className="text-xs text-amber-400 text-center">
            Select at least one refactoring item to create a simulation
          </p>
        )}
      </div>
    </motion.div>
  );
}
