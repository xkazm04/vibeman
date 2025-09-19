import React, { useState } from 'react';
import { Plus,  Code, Database, Layers, Grid, Activity, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import ContextCards from './ContextCards';

interface ContextSectionProps {
  group?: ContextGroup;
  contexts: Context[];
  projectId: string;
  className?: string;
  isEmpty?: boolean;
  onCreateGroup?: () => void;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
}

export default function ContextSection({
  group,
  contexts,
  projectId,
  className = '',
  isEmpty = false,
  onCreateGroup,
  availableGroups,
  selectedFilePaths
}: ContextSectionProps) {
  const { moveContext } = useContextStore();
  const { showFullScreenModal } = useGlobalModal();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (group) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!group) return;

    const contextId = e.dataTransfer.getData('text/plain');
    if (contextId) {
      try {
        await moveContext(contextId, group.id);
      } catch (error) {
        console.error('Failed to move context:', error);
      }
    }
  };

  // Get group icon based on name or use default
  const getGroupIcon = () => {
    const name = group?.name.toLowerCase() || '';
    if (name.includes('api') || name.includes('backend')) return Database;
    if (name.includes('ui') || name.includes('component')) return Layers;
    if (name.includes('util') || name.includes('helper')) return Grid;
    if (name.includes('test') || name.includes('spec')) return Activity;
    if (name.includes('config') || name.includes('setting')) return Cpu;
    return Code;
  };

  const GroupIcon = getGroupIcon();

  // Empty slot - show create group button
  if (isEmpty) {
    return (
      <motion.div
        className={`${className} relative overflow-hidden`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent rounded-2xl" />

        <button
          onClick={onCreateGroup}
          className="relative flex flex-col items-center justify-center w-full h-full p-8 hover:bg-white/[0.02] transition-all duration-300 group rounded-2xl border border-gray-700/30 hover:border-purple-500/30"
        >
          <motion.div
            className="relative mb-4"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 rounded-2xl flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
              <Plus className="w-8 h-8 text-purple-400 group-hover:text-purple-300" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-gray-300 group-hover:text-white transition-colors font-mono">
              Create New Group
            </p>
            <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors max-w-48">
              Organize your contexts into intelligent collections
            </p>
          </div>

          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
        </button>
      </motion.div>
    );
  }

  // Group exists
  return (
    <motion.div
      className={`${className} relative overflow-hidden rounded-2xl border transition-all duration-300 ${isDragOver
        ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20'
        : 'border-gray-700/30 hover:border-gray-600/50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background Effects */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${group?.color}20 0%, transparent 50%, ${group?.color}10 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

      {/* Animated Border Glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0"
        style={{
          background: `linear-gradient(45deg, ${group?.color}40, transparent, ${group?.color}40)`,
          filter: 'blur(1px)',
        }}
        animate={{ opacity: isHovered ? 0.3 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Group Header */}
      <div className="relative p-6 border-b border-gray-700/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
              <div className="text-left absolute left-5 top-2 flex flex-row gap-3">
              <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300"
                  style={{
                    backgroundColor: `${group?.color}20`,
                    border: `1px solid ${group?.color}30`
                  }}
                >
                  <GroupIcon
                    className="w-6 h-6 transition-colors duration-300"
                    style={{ color: group?.color }}
                  />
                </div>

                <h3 className="text-xl font-bold text-white font-mono group-hover:text-gray-100 transition-colors">
                  {group?.name || 'Unnamed Group'}
                </h3>
              </div>
          </div>

          {/* Group Stats */}
          <div className="flex flex-row items-center absolute right-5 top-2 space-x-4">
              <div className="text-xl font-bold font-mono" style={{ color: group?.color }}>
                {contexts.length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                x
              </div>

            {contexts.length > 0 && (
              <div className="w-16 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: group?.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((contexts.length / 10) * 100, 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Cards */}
      <AnimatePresence>
        {isExpanded && (
          <ContextCards 
            contexts={contexts}
            group={group}
            availableGroups={availableGroups}
            selectedFilePaths={selectedFilePaths}
            showFullScreenModal={showFullScreenModal}
            />
        )}
      </AnimatePresence>

      {/* Hover Effect Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${group?.color}05 0%, transparent 50%, ${group?.color}05 100%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}