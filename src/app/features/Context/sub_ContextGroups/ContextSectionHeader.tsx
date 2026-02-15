import React from 'react';
import { motion } from 'framer-motion';
import { Code, Database, Layers, Grid, Activity, Cpu } from 'lucide-react';
import { ContextGroup, Context } from '../../../../stores/contextStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { isFrontendType } from '../../../../lib/projectTypeHelpers';
import { SYNTHETIC_GROUP_ID } from '../lib/constants';
import { GroupHealthScanButton } from './components/GroupHealthScanButton';
import { BeautifyScanButton } from './components/BeautifyScanButton';
import { PerformanceScanButton } from './components/PerformanceScanButton';
import { ProductionScanButton } from './components/ProductionScanButton';

interface ContextSectionHeaderProps {
  group?: ContextGroup;
  contexts: Context[];
  projectId: string;
  openGroupDetail: (groupId: string) => void;
}

const ContextSectionHeader = React.memo(({ group, contexts, projectId, openGroupDetail }: ContextSectionHeaderProps) => {
  const { activeProject } = useActiveProjectStore();
  const isSyntheticGroup = group?.id === SYNTHETIC_GROUP_ID;
  const showBeautifyButton = activeProject?.type ? isFrontendType(activeProject.type) : false;

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
    <div className="relative z-10 p-6 border-b border-gray-700/20 bg-gradient-to-r from-gray-800/30 via-transparent to-gray-800/30 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (group && group.id !== SYNTHETIC_GROUP_ID) {
                openGroupDetail(group.id);
              }
            }}
            className={`text-left absolute left-5 top-2 flex flex-row gap-3 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-xl ${group && group.id !== SYNTHETIC_GROUP_ID
              ? 'hover:opacity-80 cursor-pointer group'
              : 'cursor-default'
              }`}
            disabled={!group || group.id === SYNTHETIC_GROUP_ID}
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

        {/* Right side: Scan Buttons */}
        <div className="flex flex-row items-center absolute right-5 top-2 space-x-2 z-20">
          {!isSyntheticGroup && group && (
            <>
              {/* Refactor Button */}
              <GroupHealthScanButton
                groupId={group.id}
                projectId={projectId}
                color={group.color}
                lastScanAt={group.lastScanAt}
              />

              {/* Beautify Button - only for React/NextJS projects */}
              {showBeautifyButton && (
                <BeautifyScanButton
                  groupId={group.id}
                  projectId={projectId}
                  color={group.color}
                />
              )}

              {/* Performance Button - all projects */}
              <PerformanceScanButton
                groupId={group.id}
                projectId={projectId}
                color={group.color}
              />

              {/* Production Quality Button - all projects */}
              <ProductionScanButton
                groupId={group.id}
                projectId={projectId}
                color={group.color}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ContextSectionHeader.displayName = 'ContextSectionHeader';

export default ContextSectionHeader;