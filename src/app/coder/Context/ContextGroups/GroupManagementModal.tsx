import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Palette, Grid3X3, Sparkles, Zap, Activity, Database, Layers, Grid, Code, Cpu, Settings } from 'lucide-react';
import { ContextGroup, useContextStore, CONTEXT_GROUP_COLORS } from '../../../../stores/contextStore';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groups: ContextGroup[];
}

export default function GroupManagementModal({ isOpen, onClose, projectId, groups }: GroupManagementModalProps) {
  const { addGroup, removeGroup, updateGroup, loading } = useContextStore();
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CONTEXT_GROUP_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Code');
  const [error, setError] = useState('');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const iconOptions = [
    { name: 'Code', icon: Code },
    { name: 'Database', icon: Database },
    { name: 'Layers', icon: Layers },
    { name: 'Grid', icon: Grid },
    { name: 'Activity', icon: Activity },
    { name: 'Cpu', icon: Cpu },
    { name: 'Zap', icon: Zap },
    { name: 'Settings', icon: Settings },
  ];

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (groups.some(g => g.name.toLowerCase() === newGroupName.toLowerCase())) {
      setError('A group with this name already exists');
      return;
    }

    try {
      await addGroup({
        projectId,
        name: newGroupName.trim(),
        color: selectedColor,
      });
      
      setNewGroupName('');
      setSelectedColor(CONTEXT_GROUP_COLORS[groups.length % CONTEXT_GROUP_COLORS.length]);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: { name?: string; color?: string }) => {
    try {
      await updateGroup(groupId, updates);
      setEditingGroup(null);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure? This will delete all contexts in this group.')) {
      return;
    }

    try {
      await removeGroup(groupId);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete group');
    }
  };

  const handleClose = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Neural Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
          
          {/* Animated Neural Grid Pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
            animate={{
              backgroundPosition: ['0px 0px', '20px 20px'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Floating Neural Particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut"
              }}
            />
          ))}
          {/* Neural Header */}
          <div className="relative flex items-center justify-between p-8 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 via-slate-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-cyan-500/30"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                  }}
                >
                  <Grid3X3 className="w-8 h-8 text-cyan-400" />
                </motion.div>
                <motion.div
                  className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-2xl blur-xl opacity-50"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Orbiting Elements */}
                {Array.from({ length: 2 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 8 + i * 2,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 1,
                    }}
                  >
                    <motion.div
                      className={`w-2 h-2 rounded-full ${
                        i === 0 ? 'bg-cyan-400' : 'bg-blue-400'
                      }`}
                      style={{
                        transform: `translateX(${30 + i * 6}px)`,
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  </motion.div>
                ))}
              </div>
              <div>
                <motion.h2 
                  className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono mb-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  NEURAL CONTEXT CLUSTERS
                </motion.h2>
                <motion.p 
                  className="text-cyan-300/80 font-mono"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  Advanced workflow orchestration with quantum context management
                </motion.p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  {groups.length}/20
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  Groups
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            {/* Create New Group */}
            <motion.div 
              className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/5 rounded-2xl" />
              
              <div className="relative space-y-6">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white font-mono">Create New Group</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Group Name */}
                  <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-3 font-mono">Group Name</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => {
                        setNewGroupName(e.target.value);
                        setError('');
                      }}
                      placeholder="e.g., Frontend Components"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm font-mono"
                      maxLength={30}
                    />
                  </div>
                  
                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3 font-mono">Color Theme</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CONTEXT_GROUP_COLORS.map((color) => (
                        <motion.button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`relative w-12 h-12 rounded-xl border-2 transition-all ${
                            selectedColor === color ? 'border-white scale-110 shadow-lg' : 'border-gray-600 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {selectedColor === color && (
                            <motion.div
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background: `linear-gradient(45deg, ${color}40, transparent, ${color}40)`,
                                filter: 'blur(8px)',
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3 font-mono">Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {iconOptions.map(({ name, icon: Icon }) => (
                        <motion.button
                          key={name}
                          onClick={() => setSelectedIcon(name)}
                          className={`relative w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                            selectedIcon === name ? 'border-blue-400 bg-blue-500/20' : 'border-gray-600 hover:border-gray-400 bg-gray-700/30'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Icon className={`w-5 h-5 ${selectedIcon === name ? 'text-blue-400' : 'text-gray-400'}`} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400 font-mono">
                    {groups.length >= 20 ? (
                      <span className="text-red-400">Maximum of 20 groups reached</span>
                    ) : (
                      <span>{20 - groups.length} slots remaining</span>
                    )}
                  </div>
                  
                  <motion.button
                    onClick={handleCreateGroup}
                    disabled={loading || groups.length >= 20}
                    className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-blue-500/20 text-white rounded-xl hover:from-blue-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono border border-blue-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Group</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Existing Groups */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Activity className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white font-mono">
                    Active Groups
                  </h3>
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  {groups.length} of 20 groups
                </div>
              </div>
              
              {groups.length === 0 ? (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                      <Grid3X3 className="w-12 h-12 text-gray-500" />
                    </div>
                    <motion.div
                      className="absolute -inset-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-3xl blur-xl opacity-50"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <p className="text-lg font-semibold text-gray-300 font-mono mb-2">No groups created yet</p>
                  <p className="text-gray-500">Create your first group above to start organizing your contexts</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groups.map((group, index) => (
                    <motion.div
                      key={group.id}
                      className="relative p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30 rounded-2xl backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${group.color}10 0%, transparent 50%, ${group.color}05 100%)`,
                      }}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onMouseEnter={() => setHoveredGroup(group.id)}
                      onMouseLeave={() => setHoveredGroup(null)}
                    >
                      {/* Hover Glow Effect */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0"
                        style={{
                          background: `linear-gradient(45deg, ${group.color}20, transparent, ${group.color}20)`,
                          filter: 'blur(1px)',
                        }}
                        animate={{ opacity: hoveredGroup === group.id ? 0.5 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm"
                              style={{ 
                                backgroundColor: `${group.color}20`,
                                border: `1px solid ${group.color}30`
                              }}
                            >
                              <Code className="w-6 h-6" style={{ color: group.color }} />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            {editingGroup === group.id ? (
                              <input
                                type="text"
                                defaultValue={group.name}
                                onBlur={(e) => {
                                  if (e.target.value.trim() && e.target.value !== group.name) {
                                    handleUpdateGroup(group.id, { name: e.target.value.trim() });
                                  } else {
                                    setEditingGroup(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingGroup(null);
                                  }
                                }}
                                className="bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
                                autoFocus
                              />
                            ) : (
                              <div>
                                <h4 className="text-lg font-bold text-white font-mono mb-1">
                                  {group.name}
                                </h4>
                                <p className="text-sm text-gray-400 font-mono">
                                  Position {group.position}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Color Picker */}
                          <div className="flex space-x-1">
                            {CONTEXT_GROUP_COLORS.slice(0, 6).map((color) => (
                              <motion.button
                                key={color}
                                onClick={() => handleUpdateGroup(group.id, { color })}
                                className={`w-6 h-6 rounded-lg border-2 transition-all ${
                                  group.color === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                                }`}
                                style={{ backgroundColor: color }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title={`Change to ${color}`}
                              />
                            ))}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <motion.button
                              onClick={() => setEditingGroup(group.id)}
                              className="p-2 hover:bg-gray-600/50 rounded-lg transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="Rename group"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400" />
                            </motion.button>
                            
                            <motion.button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="Delete group"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-red-400 font-mono">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between p-8 border-t border-gray-700/30">
            <div className="text-sm text-gray-400 font-mono">
              Organize up to 20 groups with unlimited contexts each
            </div>
            
            <motion.button
              onClick={handleClose}
              className="px-6 py-3 bg-gray-700/50 text-gray-300 hover:text-white rounded-xl transition-all font-mono border border-gray-600/50 hover:border-gray-500/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Done
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}