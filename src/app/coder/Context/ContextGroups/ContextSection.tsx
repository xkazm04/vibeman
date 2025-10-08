import React, { useState } from 'react';
import { Plus, Code, Database, Layers, Grid, Activity, Cpu, Sparkles } from 'lucide-react';
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
  openGroupDetail: (groupId: string) => void;
}

export default function ContextSection({
  group,
  contexts,
  projectId,
  className = '',
  isEmpty = false,
  onCreateGroup,
  availableGroups,
  selectedFilePaths,
  openGroupDetail
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
        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
      >
        {/* Neural Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />

        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-5 rounded-2xl"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '15px 15px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '15px 15px'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <button
          onClick={onCreateGroup}
          className="relative flex flex-col items-center justify-center w-full h-full p-8 hover:bg-white/[0.02] transition-all duration-300 group rounded-2xl border border-gray-700/30 hover:border-cyan-500/30"
        >
          <motion.div
            className="relative mb-4"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 via-slate-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:via-slate-500/30 group-hover:to-blue-500/30 rounded-2xl flex items-center justify-center transition-all duration-300 backdrop-blur-sm border border-cyan-500/30">
              <Plus className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300" />
            </div>
            <motion.div 
              className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          <div className="text-center space-y-2">
            <p className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all font-mono">
              Create Neural Cluster
            </p>
            <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors max-w-48">
              Initialize new context orchestration node
            </p>
          </div>

          {/* Floating Particles */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}

          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
        </button>
      </motion.div>
    );
  }

  // Group exists
  return (
    <motion.div
      className={`${className} relative overflow-hidden rounded-2xl border transition-all duration-300 ${isDragOver
        ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20'
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
      {/* Neural Background Effects */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${group?.color}20 0%, transparent 50%, ${group?.color}10 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
      
      {/* Animated Neural Grid */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(${group?.color}30 1px, transparent 1px),
            linear-gradient(90deg, ${group?.color}30 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '12px 12px'],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Floating Neural Particles */}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: `${group?.color}60`,
            left: `${20 + i * 20}%`,
            top: `${20 + i * 15}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
        />
      ))}

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

      {/* Neural Group Header */}
      <div className="relative p-6 border-b border-gray-700/20 bg-gradient-to-r from-gray-800/30 via-transparent to-gray-800/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (group && group.id !== 'synthetic-to-group') {
                  openGroupDetail(group.id);
                }
              }}
              className={`text-left absolute left-5 top-2 flex flex-row gap-3 transition-all duration-300 ${group && group.id !== 'synthetic-to-group'
                ? 'hover:opacity-80 cursor-pointer group'
                : 'cursor-default'
                }`}
              disabled={!group || group.id === 'synthetic-to-group'}
            >
              <motion.div
                className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 border"
                style={{
                  backgroundColor: `${group?.color}20`,
                  borderColor: `${group?.color}30`
                }}
                whileHover={{ scale: 1.1 }}
                animate={{
                  boxShadow: [`0 0 0 ${group?.color}00`, `0 0 20px ${group?.color}40`, `0 0 0 ${group?.color}00`]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <GroupIcon
                  className="w-6 h-6 transition-colors duration-300"
                  style={{ color: group?.color }}
                />
              </motion.div>

              <motion.h3 
                className="text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent font-mono group-hover:from-white group-hover:to-gray-200 transition-all"
                style={{
                  backgroundImage: `linear-gradient(to right, ${group?.color}, ${group?.color}80)`
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {group?.name || 'Unnamed Cluster'}
              </motion.h3>
            </button>
          </div>

          {/* Neural Stats Display */}
          <div className="flex flex-row items-center absolute right-5 top-2 space-x-4">
            <motion.div 
              className="text-xl font-bold font-mono"
              style={{ color: group?.color }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {contexts.length}
            </motion.div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">
              nodes
            </div>

            {contexts.length > 0 && (
              <div className="w-16 h-2 bg-gray-700/50 rounded-full overflow-hidden border border-gray-600/30">
                <motion.div
                  className="h-full rounded-full"
                  style={{ 
                    backgroundColor: group?.color,
                    boxShadow: `0 0 8px ${group?.color}60`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((contexts.length / 10) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
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