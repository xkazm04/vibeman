import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, FileText, Calendar, FolderTree, Clock, Edit3, Trash2, Code, Database, Layers, Grid, Activity, Cpu } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { normalizePath } from '../../../../utils/pathUtils';
import ActionButton from './ActionButton';
import StatCard from './StatCard';

interface GroupDetailViewProps {
  groupId: string;
  onClose: () => void;
}

export default function GroupDetailView({ groupId, onClose }: GroupDetailViewProps) {
  const { contexts, groups } = useContextStore();
  const { showConfirmModal } = useGlobalModal();
  const [selectedGroup, setSelectedGroup] = useState<ContextGroup | null>(null);
  const [groupContexts, setGroupContexts] = useState<Context[]>([]);

  // Find the group and its contexts
  useEffect(() => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      const contextList = contexts.filter(c => c.groupId === groupId);
      setGroupContexts(contextList);
    }
  }, [groupId, contexts, groups]);

  // Get group icon based on name or use default
  const getGroupIcon = () => {
    const name = selectedGroup?.name.toLowerCase() || '';
    if (name.includes('api') || name.includes('backend')) return Database;
    if (name.includes('ui') || name.includes('component')) return Layers;
    if (name.includes('util') || name.includes('helper')) return Grid;
    if (name.includes('test') || name.includes('spec')) return Activity;
    if (name.includes('config') || name.includes('setting')) return Cpu;
    return Code;
  };

  const GroupIcon = getGroupIcon();

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    showConfirmModal(
      'Delete Group',
      `Are you sure you want to delete "${selectedGroup.name}"? This will ungroup all contexts but won't delete them.`,
      async () => {
        onClose();
      }
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate total files across all contexts
  const totalFiles = groupContexts.reduce((sum, context) => sum + context.filePaths.length, 0);

  const allFilePaths = Array.from(new Set(groupContexts.flatMap(context =>
    context.filePaths.map(normalizePath)
  )));

  const getGridColumns = (count: number): string => {
    if (count === 1) return 'grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  if (!selectedGroup) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <FolderTree className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-xl text-gray-400">Group not found</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-[95vw] h-full max-h-[95vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/40 overflow-hidden shadow-2xl"
      >
        {/* Header Panel - Fixed with higher z-index */}
        <div 
          className="relative h-20 px-8 flex items-center justify-between border-b border-gray-700/30 z-[110] bg-gray-900/95 backdrop-blur-xl"
          style={{
            background: `linear-gradient(135deg, ${selectedGroup.color}15 0%, rgba(17, 24, 39, 0.95) 50%, ${selectedGroup.color}05 100%)`
          }}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
          
          {/* Left Section - Group Info */}
          <div className="flex items-center space-x-4 relative z-[111]">
            <motion.button
              onClick={onClose}
              className="p-3 hover:bg-gray-700/50 rounded-xl transition-all border border-gray-600/30 hover:border-gray-500/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-6 h-6 text-gray-300" />
            </motion.button>
            
            <div className="flex items-center space-x-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2"
                style={{
                  backgroundColor: `${selectedGroup.color}20`,
                  borderColor: `${selectedGroup.color}40`
                }}
              >
                <GroupIcon
                  className="w-7 h-7"
                  style={{ color: selectedGroup.color }}
                />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-white font-mono">
                  {selectedGroup.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400 font-mono">
                  <span>{groupContexts.length} contexts</span>
                  <span>•</span>
                  <span>{totalFiles} files</span>
                  <span>•</span>
                  <span>{allFilePaths.length} unique paths</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3 relative z-[111]">
            <ActionButton
              onClick={() => {/* TODO: Implement edit */}}
              icon={Edit3}
              variant="primary"
            />

            <ActionButton
              onClick={handleDeleteGroup}
              icon={Trash2}
              variant="danger"
            />

            <ActionButton
              onClick={onClose}
              icon={X}
              variant="secondary"
              className="w-6 h-6"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-full mx-auto space-y-8">
              
              {/* Group Overview Stats */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <StatCard
                  icon={FolderTree}
                  value={groupContexts.length}
                  label="Contexts"
                  iconColor={selectedGroup.color}
                  iconBgColor={`${selectedGroup.color}20`}
                />

                <StatCard
                  icon={FileText}
                  value={totalFiles}
                  label="Total Files"
                  iconColor="#60A5FA"
                  iconBgColor="rgba(96, 165, 250, 0.2)"
                />

                <StatCard
                  icon={Calendar}
                  value={`${Math.floor((new Date().getTime() - selectedGroup.createdAt.getTime()) / (1000 * 60 * 60 * 24))}d`}
                  label="Days Old"
                  iconColor="#60A5FA"
                  iconBgColor="rgba(96, 165, 250, 0.2)"
                />
              </motion.div>

              {/* Contexts Grid */}
              {groupContexts.length > 0 ? (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
                >
                  <h3 className="text-2xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
                    <FolderTree 
                      className="w-7 h-7" 
                      style={{ color: selectedGroup.color }}
                    />
                    <span>Contexts in {selectedGroup.name}</span>
                  </h3>

                  <div className={`grid gap-4 ${getGridColumns(groupContexts.length)}`}>
                    {groupContexts.map((context, index) => (
                      <motion.div
                        key={context.id}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.3 + index * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 30
                        }}
                        className="group"
                      >
                        {/* Enhanced Context Card with additional info */}
                        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-xl p-4 border border-gray-700/40 hover:border-gray-600/60 transition-all duration-300 group-hover:shadow-lg">
                          <div className="space-y-4">
                            {/* Context Header */}
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-bold text-white font-mono truncate" title={context.name}>
                                {context.name}
                              </h4>
                              <div 
                                className="px-2 py-1 rounded-lg text-sm font-bold font-mono"
                                style={{ 
                                  backgroundColor: `${selectedGroup.color}20`,
                                  color: selectedGroup.color 
                                }}
                              >
                                {context.filePaths.length}
                              </div>
                            </div>

                            {/* Description */}
                            {context.description && (
                              <p className="text-sm text-gray-400 line-clamp-2" title={context.description}>
                                {context.description}
                              </p>
                            )}

                            {/* File Paths Preview */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                Files ({context.filePaths.length})
                              </p>
                              <div className="max-h-32 overflow-y-auto">
                                {/* 3 columns x 5 rows grid for up to 15 files */}
                                <div className="grid grid-cols-3 gap-1">
                                  {context.filePaths.slice(0, 15).map((path, pathIndex) => {
                                    const normalizedPath = normalizePath(path);
                                    const fileName = normalizedPath.split('/').pop() || normalizedPath;
                                    return (
                                      <div key={pathIndex} className="flex items-center space-x-1 min-w-0">
                                        <div className="w-1 h-1 bg-gray-500 rounded-full flex-shrink-0"></div>
                                        <p className="text-sm text-gray-400 font-mono truncate" title={normalizedPath}>
                                          {fileName}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                                {context.filePaths.length > 15 && (
                                  <p className="text-sm text-gray-500 font-mono mt-2 text-center">
                                    +{context.filePaths.length - 15} more files
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Timestamps */}
                            <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-700/30">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(context.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-12 border border-gray-700/40 text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-700/50 rounded-full flex items-center justify-center">
                    <FolderTree className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-300 font-mono mb-2">No Contexts Yet</h3>
                  <p className="text-gray-500">This group is empty. Add some contexts to get started.</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}