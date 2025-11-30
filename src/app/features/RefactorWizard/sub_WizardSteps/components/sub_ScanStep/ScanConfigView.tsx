'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { Scan, Zap, Shield, Code2, FileSearch, FolderTree } from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import FolderSelector from '../../../components/FolderSelector';

/**
 * ScanConfigView - Pre-scan configuration UI component.
 *
 * Displays project information, folder selector for scoping the scan,
 * and analysis capability cards.
 *
 * @component
 *
 * @example
 * <ScanConfigView
 *   activeProject={project}
 *   selectedFolders={[]}
 *   onFoldersChange={(folders) => setSelectedFolders(folders)}
 * />
 */
export interface ScanConfigViewProps {
  activeProject: {
    id?: string;
    name?: string;
    path?: string;
    type?: string;
  } | null;
  selectedFolders: string[];
  onFoldersChange: (folders: string[]) => void;
}

// Analysis feature card
function AnalysisFeatureCard({ icon: Icon, label, color, delay }: {
  icon: React.ElementType;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex items-center gap-2 text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5 hover:border-${color}-500/30 transition-colors group`}
    >
      <div className={`p-1.5 rounded bg-${color}-500/10 group-hover:bg-${color}-500/20 transition-colors`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <span>{label}</span>
    </motion.div>
  );
}

export function ScanConfigView({ activeProject, selectedFolders, onFoldersChange }: ScanConfigViewProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <motion.div
      key="config"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Project Info */}
      <CyberCard>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <FolderTree className={`w-4 h-4 ${colors.textDark}`} />
              Project to Analyze
            </label>
            <CyberCard variant="dark" className="!p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${colors.bgHover} to-blue-500/20 rounded-xl flex items-center justify-center border ${colors.border} shadow-lg ${colors.shadow}`}>
                  <Scan className={`w-6 h-6 ${colors.textDark}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-lg">
                    {activeProject?.name || 'No project selected'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1 truncate font-mono">
                    {activeProject?.path || 'Please select a project'}
                  </p>
                </div>
                {activeProject?.type && (
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium">
                    {activeProject.type}
                  </span>
                )}
              </div>
            </CyberCard>
          </div>

          {/* Folder Selection */}
          <div>
            <FolderSelector
              selectedFolders={selectedFolders}
              onFoldersChange={onFoldersChange}
            />
          </div>
        </div>
      </CyberCard>

      {/* Analysis Features */}
      <CyberCard variant="glow">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className={`${colors.text} font-medium flex items-center gap-2`}>
              <Zap className="w-4 h-4" />
              Analysis Capabilities
            </h4>
            <span className={`text-xs ${colors.textDark} opacity-60 font-mono`}>4 MODULES</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AnalysisFeatureCard icon={Code2} label="Code Quality" color="blue" delay={0.1} />
            <AnalysisFeatureCard icon={Shield} label="Security" color="purple" delay={0.2} />
            <AnalysisFeatureCard icon={FileSearch} label="Maintainability" color="green" delay={0.3} />
            <AnalysisFeatureCard icon={Zap} label="Performance" color="yellow" delay={0.4} />
          </div>

          <p className="text-xs text-gray-500 pt-2 border-t border-white/5">
            💡 Static analysis identifies patterns and issues without executing code. AI-powered deep analysis is available in subsequent steps.
          </p>
        </div>
      </CyberCard>
    </motion.div>
  );
}

export default ScanConfigView;
