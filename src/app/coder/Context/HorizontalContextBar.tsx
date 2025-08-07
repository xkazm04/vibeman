import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderTree, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../../stores/nodeStore';
import { useContextStore } from '../../../stores/contextStore';
import ContextSaveModal from './ContextSaveModal';
import ContextSection from './ContextSection';

interface HorizontalContextBarProps {
  selectedFilesCount: number;
  selectedFilePaths: string[];
}

export default function HorizontalContextBar({ selectedFilesCount, selectedFilePaths }: HorizontalContextBarProps) {
  const { contexts } = useContextStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const leftContexts = contexts.filter(ctx => ctx.section === 'left');
  const centerContexts = contexts.filter(ctx => ctx.section === 'center');
  const rightContexts = contexts.filter(ctx => ctx.section === 'right');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/30 rounded-lg overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-b border-gray-600/20">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-purple-500/20 rounded-md">
              <FolderTree className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white font-mono">Contexts</h3>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-400">({contexts.length}/10)</span>
                {contexts.length >= 8 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-sm">
                    {contexts.length >= 10 ? 'Full' : 'Almost Full'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedFilesCount > 0 && (
              <div className="flex items-center space-x-2 px-2 py-1 bg-cyan-500/10 rounded-md">
                <span className="text-xs text-cyan-400">{selectedFilesCount} files selected</span>
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={contexts.length >= 10}
                  className="flex items-center space-x-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-mono"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-700/50 rounded-sm transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Context Sections */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex h-20">
                {/* Left Section */}
                <ContextSection
                  section="left"
                  contexts={leftContexts}
                  title="Development"
                  className="flex-1 border-r border-gray-600/20"
                />
                
                {/* Center Section */}
                <ContextSection
                  section="center"
                  contexts={centerContexts}
                  title="Testing"
                  className="flex-1 border-r border-gray-600/20"
                />
                
                {/* Right Section */}
                <ContextSection
                  section="right"
                  contexts={rightContexts}
                  title="Production"
                  className="flex-1"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ContextSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        selectedFilePaths={selectedFilePaths}
      />
    </>
  );
}