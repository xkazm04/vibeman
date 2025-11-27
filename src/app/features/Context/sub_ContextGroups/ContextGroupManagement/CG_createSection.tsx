'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, Code, Database, Layers, Grid, Activity, Cpu, Zap, Settings,
  Globe, Shield, Users, FileText, Box, Terminal, Workflow, Server
} from 'lucide-react';
import { ContextGroup } from '@/stores/contextStore';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';

interface CreateGroupSectionProps {
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  groups: ContextGroup[];
  loading: boolean;
  onCreateGroup: () => void;
  setError: (error: string) => void;
}

const iconOptions = [
  // Row 1 - Original icons
  { name: 'Code', icon: Code },
  { name: 'Database', icon: Database },
  { name: 'Layers', icon: Layers },
  { name: 'Grid', icon: Grid },
  { name: 'Activity', icon: Activity },
  { name: 'Cpu', icon: Cpu },
  { name: 'Zap', icon: Zap },
  { name: 'Settings', icon: Settings },
  // Row 2 - Extended icons for feature sets
  { name: 'Globe', icon: Globe },
  { name: 'Shield', icon: Shield },
  { name: 'Users', icon: Users },
  { name: 'FileText', icon: FileText },
  { name: 'Box', icon: Box },
  { name: 'Terminal', icon: Terminal },
  { name: 'Workflow', icon: Workflow },
  { name: 'Server', icon: Server },
];

export default function CreateGroupSection({
  newGroupName,
  setNewGroupName,
  selectedColor,
  setSelectedColor,
  selectedIcon,
  setSelectedIcon,
  groups,
  loading,
  onCreateGroup,
  setError,
}: CreateGroupSectionProps) {
  return (
    <motion.div 
      className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/5 rounded-2xl" />
      
      <div className="relative space-y-6">
        {/* Header with Color Swatches */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white font-mono">Create New Group</h3>
          </div>
          
          {/* Color Swatches - Two Rows of 9 */}
          <div className="flex flex-wrap gap-1.5" style={{ width: '246px' }}>
            {CONTEXT_GROUP_COLORS.map((color) => (
              <motion.button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-lg border transition-all flex-shrink-0 ${
                  selectedColor === color ? 'border-white scale-110 shadow-lg' : 'border-gray-600/50 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Select color"
              >
                {selectedColor === color && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: `linear-gradient(45deg, ${color}40, transparent, ${color}40)`,
                      filter: 'blur(6px)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Group Name - Full Width on Left */}
          <div>
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
          
          {/* Icon Selection - Two Row Grid */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 font-mono">Icon Selection</label>
            <div className="grid grid-cols-8 gap-1.5">
              {iconOptions.map(({ name, icon: Icon }) => (
                <motion.button
                  key={name}
                  onClick={() => setSelectedIcon(name)}
                  className={`w-10 h-10 rounded-lg border transition-all flex items-center justify-center ${
                    selectedIcon === name ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30' : 'border-gray-600 hover:border-gray-400 bg-gray-700/30'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={name}
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
            onClick={onCreateGroup}
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
  );
}
