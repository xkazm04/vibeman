/**
 * Blueprint Runner Panel
 * Main container with visualization concepts and controls
 * Supports infinite cycling with decision node for confirmation
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, RotateCcw, X, Repeat } from 'lucide-react';
import { VisualizationConcept } from './types';
import { useBlueprintSimulation, useTimelineSimulation } from './useBlueprintSimulation';
import ConceptHorizontal from './ConceptHorizontal';
import ConceptCircuit from './ConceptCircuit';
import ConceptRadial from './ConceptRadial';

interface BlueprintRunnerPanelProps {
  concept: VisualizationConcept;
  onClose: () => void;
}

export default function BlueprintRunnerPanel({ concept, onClose }: BlueprintRunnerPanelProps) {
  // Use timeline simulation for horizontal, standard for others
  const timelineSim = useTimelineSimulation();
  const standardSim = useBlueprintSimulation();

  // Select appropriate simulation based on concept
  const isTimeline = concept === 'horizontal';

  // Render the appropriate concept
  const renderConcept = () => {
    if (concept === 'horizontal') {
      return (
        <ConceptHorizontal
          instances={timelineSim.instances}
          currentInstanceId={timelineSim.currentInstanceId}
          cycleCount={timelineSim.cycleCount}
          isRunning={timelineSim.isRunning}
        />
      );
    }
    if (concept === 'circuit') {
      return (
        <ConceptCircuit
          nodes={standardSim.nodes}
          edges={standardSim.edges}
          currentNodeId={standardSim.currentNodeId}
          cycleCount={standardSim.cycleCount}
          waitingForDecision={standardSim.waitingForDecision}
          onConfirm={standardSim.confirmContinue}
          onDecline={standardSim.declineContinue}
        />
      );
    }
    if (concept === 'radial') {
      return (
        <ConceptRadial
          nodes={standardSim.nodes}
          currentNodeId={standardSim.currentNodeId}
          cycleCount={standardSim.cycleCount}
          waitingForDecision={standardSim.waitingForDecision}
          onConfirm={standardSim.confirmContinue}
          onDecline={standardSim.declineContinue}
        />
      );
    }
    return null;
  };

  // Get current state based on concept
  const isRunning = isTimeline ? timelineSim.isRunning : standardSim.isRunning;
  const cycleCount = isTimeline ? timelineSim.cycleCount : standardSim.cycleCount;
  const waitingForDecision = isTimeline ? false : standardSim.waitingForDecision;
  const completedCount = isTimeline
    ? timelineSim.instances.filter(i => i.status === 'completed').length
    : standardSim.completedNodeIds.length;
  const totalNodes = isTimeline ? 4 : standardSim.nodes.filter(n => n.type !== 'decision').length;

  // Actions
  const start = isTimeline ? timelineSim.start : standardSim.start;
  const cancel = isTimeline ? timelineSim.cancel : standardSim.cancel;
  const reset = isTimeline ? timelineSim.reset : standardSim.reset;

  const hasStarted = isRunning || cycleCount > 0 || completedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-8 z-50 flex"
    >
      {/* Main visualization area */}
      <div className="flex-1 bg-gray-950/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800/50">
          <div>
            <h2 className="text-base font-semibold text-white">Blueprint Runner</h2>
            <p className="text-xs text-gray-500">
              <span className="text-cyan-400 capitalize">{concept}</span>
              {isTimeline ? ' - Infinite Loop' : ' - Decision Gated'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Cycle counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
              <Repeat className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs font-mono text-gray-300">Cycle {cycleCount + 1}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Visualization */}
        <div className="flex-1 p-4 overflow-hidden">
          {renderConcept()}
        </div>

        {/* Status bar */}
        <div className="px-6 py-2 border-t border-gray-800/50 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                waitingForDecision ? 'bg-pink-400 animate-pulse' :
                isRunning ? 'bg-cyan-400 animate-pulse' :
                hasStarted ? 'bg-emerald-500' : 'bg-gray-600'
              }`} />
              <span className="text-xs text-gray-400">
                {waitingForDecision
                  ? 'Awaiting Decision'
                  : isRunning
                  ? 'Running...'
                  : hasStarted
                  ? 'Paused'
                  : 'Ready'}
              </span>
            </div>
            {isTimeline && (
              <div className="text-xs text-gray-500">
                {timelineSim.instances.length} nodes processed
              </div>
            )}
          </div>

          {/* Progress (for non-timeline) */}
          {!isTimeline && (isRunning || hasStarted) && (
            <div className="flex-1 max-w-xs mx-4">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                  animate={{ width: `${(completedCount / totalNodes) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control panel */}
      <div className="w-44 ml-4 flex flex-col gap-2">
        {/* Start/Cancel button */}
        {!isRunning && !waitingForDecision ? (
          <motion.button
            onClick={start}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Play className="w-4 h-4" />
            <span>{hasStarted ? 'Resume' : 'Start'}</span>
          </motion.button>
        ) : (
          <motion.button
            onClick={cancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 transition-all"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </motion.button>
        )}

        {/* Reset button */}
        <motion.button
          onClick={reset}
          disabled={isRunning}
          whileHover={{ scale: isRunning ? 1 : 1.02 }}
          whileTap={{ scale: isRunning ? 1 : 0.98 }}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            isRunning
              ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </motion.button>

        {/* Info card */}
        <div className="mt-auto p-3 bg-gray-900/50 border border-gray-800/50 rounded-xl">
          <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Mode
          </h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            {concept === 'horizontal' && (
              'Infinite scrolling timeline. Nodes flow continuously until stopped.'
            )}
            {concept === 'circuit' && (
              'PCB with decision gate. Confirm YES to cycle again, NO to stop.'
            )}
            {concept === 'radial' && (
              'Orbital with decision gate. After each cycle, choose to continue or stop.'
            )}
          </p>
        </div>

        {/* Decision hint */}
        {!isTimeline && (
          <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl">
            <h4 className="text-[10px] font-medium text-pink-400 uppercase tracking-wider mb-1">
              Decision Gate
            </h4>
            <p className="text-[10px] text-pink-300/70 leading-relaxed">
              After each cycle completes, click YES to run another cycle or NO to stop.
            </p>
          </div>
        )}

        {/* Shortcuts */}
        <div className="p-3 bg-gray-900/30 border border-gray-800/30 rounded-xl">
          <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Shortcuts
          </h4>
          <div className="space-y-1 text-[10px] text-gray-600">
            <div className="flex justify-between">
              <span>Start/Stop</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Space</kbd>
            </div>
            <div className="flex justify-between">
              <span>Reset</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">R</kbd>
            </div>
            <div className="flex justify-between">
              <span>Close</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
