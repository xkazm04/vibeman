/**
 * Chain Builder
 * Allows users to chain multiple blueprints together for serial execution
 * Drag and drop interface for building scan chains
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, Play, GripVertical, Link2, ArrowRight,
  ChevronRight, Settings, X, Sparkles
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useBlueprintComposerStore } from '../store/blueprintComposerStore';
import { BlueprintComposition, ScanChain, COLOR_PALETTE } from '../types';

interface ChainBuilderProps {
  onRun?: (chain: ScanChain) => void;
}

// Get Lucide icon by name
function getIcon(name: string): React.ElementType {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  return IconComponent || LucideIcons.Circle;
}

export default function ChainBuilder({ onRun }: ChainBuilderProps) {
  const {
    savedBlueprints,
    chains,
    createChain,
    addBlueprintToChain,
    removeBlueprintFromChain,
    reorderChain,
    deleteChain,
  } = useBlueprintComposerStore();

  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [newChainName, setNewChainName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedChain = chains.find(c => c.id === selectedChainId);

  // Get blueprint by id
  const getBlueprintById = (id: string): BlueprintComposition | undefined => {
    return savedBlueprints.find(b => b.id === id);
  };

  // Handle creating a new chain
  const handleCreateChain = () => {
    if (!newChainName.trim()) return;
    const chain = createChain(newChainName.trim(), '');
    setSelectedChainId(chain.id);
    setNewChainName('');
    setIsCreating(false);
  };

  // Handle adding a blueprint to the chain
  const handleAddBlueprint = (blueprintId: string) => {
    if (!selectedChainId) return;
    addBlueprintToChain(selectedChainId, blueprintId);
  };

  // Handle removing a blueprint from the chain
  const handleRemoveBlueprint = (blueprintId: string) => {
    if (!selectedChainId) return;
    removeBlueprintFromChain(selectedChainId, blueprintId);
  };

  // Handle reordering
  const handleReorder = (newOrder: string[]) => {
    if (!selectedChainId || !selectedChain) return;

    // Find which item moved
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i] !== selectedChain.blueprints[i]) {
        const fromIndex = selectedChain.blueprints.indexOf(newOrder[i]);
        reorderChain(selectedChainId, fromIndex, i);
        break;
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-medium text-white">Scan Chains</h3>
            <p className="text-[10px] text-gray-500">
              Chain blueprints for sequential execution
            </p>
          </div>
        </div>

        {/* Create new chain button */}
        {!isCreating && (
          <motion.button
            onClick={() => setIsCreating(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chain
          </motion.button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chain list */}
        <div className="w-1/3 border-r border-gray-800/50 overflow-y-auto">
          <div className="p-3 space-y-2">
            {/* New chain form */}
            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newChainName}
                    onChange={(e) => setNewChainName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateChain()}
                    placeholder="Chain name..."
                    autoFocus
                    className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleCreateChain}
                    className="p-1.5 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewChainName('');
                    }}
                    className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chain list */}
            {chains.map((chain) => (
              <motion.button
                key={chain.id}
                onClick={() => setSelectedChainId(chain.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                  selectedChainId === chain.id
                    ? 'bg-violet-500/20 border border-violet-500/30'
                    : 'bg-gray-800/30 border border-transparent hover:border-gray-700'
                }`}
                whileHover={{ x: 2 }}
              >
                <Link2 className={`w-4 h-4 ${
                  selectedChainId === chain.id ? 'text-violet-400' : 'text-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${
                    selectedChainId === chain.id ? 'text-violet-300' : 'text-gray-400'
                  }`}>
                    {chain.name}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {chain.blueprints.length} blueprint{chain.blueprints.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronRight className={`w-3 h-3 ${
                  selectedChainId === chain.id ? 'text-violet-400' : 'text-gray-600'
                }`} />
              </motion.button>
            ))}

            {chains.length === 0 && !isCreating && (
              <div className="text-center py-8">
                <Link2 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No chains yet</p>
                <p className="text-[10px] text-gray-700 mt-1">
                  Create a chain to sequence blueprints
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chain editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChain ? (
            <>
              {/* Chain header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
                <div>
                  <h4 className="text-sm font-medium text-white">{selectedChain.name}</h4>
                  <p className="text-[10px] text-gray-500">
                    Drag to reorder • {selectedChain.blueprints.length} step{selectedChain.blueprints.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRun?.(selectedChain)}
                    disabled={selectedChain.blueprints.length === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedChain.blueprints.length > 0
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run Chain
                  </button>
                  <button
                    onClick={() => {
                      deleteChain(selectedChain.id);
                      setSelectedChainId(null);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chain steps */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedChain.blueprints.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={selectedChain.blueprints}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {selectedChain.blueprints.map((blueprintId, index) => {
                      const blueprint = getBlueprintById(blueprintId);
                      if (!blueprint) return null;

                      const colorMeta = COLOR_PALETTE.find(c => c.value === blueprint.color);

                      return (
                        <Reorder.Item
                          key={blueprintId}
                          value={blueprintId}
                          className="relative"
                        >
                          <motion.div
                            layout
                            className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl group cursor-grab active:cursor-grabbing"
                            whileHover={{ scale: 1.01 }}
                          >
                            {/* Drag handle */}
                            <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />

                            {/* Step number */}
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono"
                              style={{
                                backgroundColor: `${blueprint.color}20`,
                                color: blueprint.color,
                              }}
                            >
                              {index + 1}
                            </div>

                            {/* Blueprint info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white truncate">
                                {blueprint.name}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {blueprint.analyzer?.name || 'No analyzer'}
                                {blueprint.processors.length > 0 && ` → ${blueprint.processors.length} processor${blueprint.processors.length !== 1 ? 's' : ''}`}
                              </div>
                            </div>

                            {/* Color indicator */}
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: blueprint.color }}
                            />

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveBlueprint(blueprintId)}
                              className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>

                          {/* Arrow connector */}
                          {index < selectedChain.blueprints.length - 1 && (
                            <div className="flex justify-center py-1">
                              <ArrowRight className="w-4 h-4 text-gray-700 rotate-90" />
                            </div>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Add blueprints to this chain</p>
                      <p className="text-[10px] text-gray-700 mt-1">
                        Drag from the list below
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Available blueprints */}
              <div className="border-t border-gray-800/50 p-3">
                <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Available Blueprints
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {savedBlueprints.map((blueprint) => {
                    const isInChain = selectedChain.blueprints.includes(blueprint.id!);

                    return (
                      <button
                        key={blueprint.id}
                        onClick={() => !isInChain && handleAddBlueprint(blueprint.id!)}
                        disabled={isInChain}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                          isInChain
                            ? 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isInChain ? '#4b5563' : blueprint.color }}
                        />
                        <span className="text-xs">{blueprint.name}</span>
                        {!isInChain && <Plus className="w-3 h-3 text-gray-500" />}
                      </button>
                    );
                  })}
                  {savedBlueprints.length === 0 && (
                    <span className="text-xs text-gray-600">
                      No blueprints saved yet
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Link2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Select a Chain
                </h3>
                <p className="text-xs text-gray-600 max-w-xs">
                  Choose a chain from the left or create a new one to start building
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
