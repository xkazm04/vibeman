import React from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Grid3X3, ChevronUp } from 'lucide-react';
import { ContextGroup } from '../../../../stores/contextStore';
import GlowWrapper from '@/app/features/Onboarding/components/GlowWrapper';
import { useActiveOnboardingStep } from '@/app/features/Onboarding/lib/useOnboardingConditions';

interface HorizontalContextBarHeaderProps {
  selectedFilesCount: number;
  selectedFilePaths: string[];
  groups: ContextGroup[];
  ungroupedContextsCount: number;
  contextsCount: number;
  loading: boolean;
  isExpanded: boolean;
  onSaveClick: () => void;
  onAddContextClick: () => void;
  onToggleExpanded: () => void;
}

const HorizontalContextBarHeader = React.memo(({
  selectedFilesCount,
  selectedFilePaths,
  groups,
  ungroupedContextsCount,
  contextsCount,
  loading,
  isExpanded,
  onSaveClick,
  onAddContextClick,
  onToggleExpanded
}: HorizontalContextBarHeaderProps) => {
  // Onboarding
  const { isComposeContextActive } = useActiveOnboardingStep();
  return (
    <div className="relative flex items-center justify-between px-8 py-6 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 border-b border-gray-700/30 backdrop-blur-sm">
      <div className="flex items-center space-x-6">
        {/* Smart Save Button - Enhanced with better visuals */}
        <motion.button
          onClick={onSaveClick}
          className={`relative group p-4 rounded-2xl transition-all duration-300 backdrop-blur-sm ${selectedFilesCount > 0 && groups.length > 0
            ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 shadow-lg shadow-cyan-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 hover:shadow-cyan-500/30 border border-cyan-500/30'
            : 'bg-gradient-to-r from-blue-500/20 to-blue-500/20 text-blue-400 hover:from-blue-500/30 hover:to-blue-500/30 border border-blue-500/30'
            }`}
          title={selectedFilesCount > 0 && groups.length > 0 ? `Save ${selectedFilesCount} selected files` : 'Manage groups'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {selectedFilesCount > 0 && groups.length > 0 ? (
            <Save className="w-6 h-6" />
          ) : (
            <Grid3X3 className="w-6 h-6" />
          )}

          {/* Neural Glow Effect */}
          <motion.div
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: selectedFilesCount > 0 && groups.length > 0
                ? 'linear-gradient(45deg, #06b6d4, transparent, #06b6d4)'
                : 'linear-gradient(45deg, #8b5cf6, transparent, #8b5cf6)',
              filter: 'blur(8px)',
            }}
          />
          
          {/* Floating Particles Effect */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${20 + i * 20}%`,
                top: `${30 + i * 15}%`,
              }}
              animate={{
                y: [0, -10, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </motion.button>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            <div>
              <motion.h3 
                className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono mb-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                CONTEXT LIST
              </motion.h3>
              <motion.div 
                className="flex items-center space-x-4 text-sm text-gray-400 font-mono"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="flex items-center space-x-2">
                  <motion.div 
                    className="w-2 h-2 bg-blue-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span>{groups.length + (ungroupedContextsCount > 0 ? 1 : 0)} neural clusters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <motion.div 
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                  <span>{contextsCount} context nodes</span>
                </div>
                {ungroupedContextsCount > 0 && (
                  <div className="flex items-center space-x-2">
                    <motion.div 
                      className="w-2 h-2 bg-yellow-400 rounded-full"
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.6, 1, 0.6] 
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-yellow-400">{ungroupedContextsCount} unlinked</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Add Context Button */}
            {groups.length > 0 && (
              <GlowWrapper isActive={isComposeContextActive}>
                <motion.button
                  onClick={onAddContextClick}
                  className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 transition-all border border-green-500/30"
                  title="Create new context"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </GlowWrapper>
            )}
          </div>

          {loading && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-blue-400 font-mono">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status indicator for selected files */}
        {selectedFilesCount > 0 && (
          <motion.div
            className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div
              className="w-3 h-3 bg-cyan-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-bold text-cyan-400 font-mono">
              {selectedFilesCount} files ready
            </span>
          </motion.div>
        )}

        <motion.button
          onClick={onToggleExpanded}
          className="p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="w-5 h-5 text-gray-400" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
});

HorizontalContextBarHeader.displayName = 'HorizontalContextBarHeader';

export default HorizontalContextBarHeader;