import React from 'react';
import { motion } from 'framer-motion';
import { Code, Database, Layers, Grid, Activity, Cpu } from 'lucide-react';
import { ContextGroup, Context } from '../../../../stores/contextStore';

interface ContextSectionHeaderProps {
  group?: ContextGroup;
  contexts: Context[];
  openGroupDetail: (groupId: string) => void;
}

const ContextSectionHeader = React.memo(({ group, contexts, openGroupDetail }: ContextSectionHeaderProps) => {
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

  return (
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
          <div className="text-sm text-gray-500 uppercase tracking-wider font-mono">
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
  );
});

ContextSectionHeader.displayName = 'ContextSectionHeader';

export default ContextSectionHeader;