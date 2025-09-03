import React, { useState } from 'react';
import { Plus, Zap, Code, Database, Layers, Grid, ChevronRight, ChevronDown, Activity, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import ContextCard from '../ContextCard';

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

  // Calculate grid layout based on context count
  const getGridLayout = () => {
    const count = contexts.length;
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    return 'grid-cols-5';
  };

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
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-3 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300"
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
                <motion.div
                  className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(45deg, ${group?.color}30, transparent, ${group?.color}30)`,
                    filter: 'blur(8px)',
                  }}
                />
              </div>

              <div className="text-left">
                <h3 className="text-xl font-bold text-white font-mono group-hover:text-gray-100 transition-colors">
                  {group?.name || 'Unnamed Group'}
                </h3>
                <p className="text-sm text-gray-400 font-mono">
                  {contexts.length} context{contexts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.button>

            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              className="ml-2"
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          </div>

          {/* Group Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono" style={{ color: group?.color }}>
                {contexts.length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Items
              </div>
            </div>

            {contexts.length > 0 && (
              <div className="w-16 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: group?.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((contexts.length / 20) * 100, 100)}%` }}
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
            style={{ overflow: 'visible' }}
          >
            <div className="p-6">
              {contexts.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="relative mb-6">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                      style={{ backgroundColor: `${group?.color}15` }}
                    >
                      <Plus
                        className="w-10 h-10"
                        style={{ color: `${group?.color}80` }}
                      />
                    </div>
                    <motion.div
                      className="absolute -inset-2 rounded-2xl opacity-50"
                      style={{
                        background: `linear-gradient(45deg, ${group?.color}20, transparent, ${group?.color}20)`,
                        filter: 'blur(12px)',
                      }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gray-300 font-mono">
                      Ready for Contexts
                    </p>
                    <p className="text-sm text-gray-500 max-w-64">
                      Drag and drop contexts here or create new ones to organize your workflow
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className={`grid gap-4 ${getGridLayout()}`}>
                  {contexts.map((context, index) => (
                    <motion.div
                      key={context.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    >
                      <ContextCard
                        context={context}
                        groupColor={group?.color}
                        availableGroups={availableGroups}
                        selectedFilePaths={selectedFilePaths}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
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