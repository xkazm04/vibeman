'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Calendar, Wrench, BookOpen, Users, TestTube } from 'lucide-react';

export type TabType = 'manager' | 'docs' | 'advisors' | 'testing';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ContextOverviewHeaderProps {
  contextName: string;
  groupColor: string;
  fileCount: number;
  createdAt?: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const TABS: Tab[] = [
  { id: 'manager', label: 'Manager', icon: Wrench },
  { id: 'testing', label: 'Testing', icon: TestTube },
  { id: 'docs', label: 'Docs', icon: BookOpen },
  { id: 'advisors', label: 'Advisors', icon: Users },
];

export default function ContextOverviewHeader({
  contextName,
  groupColor,
  fileCount,
  createdAt,
  activeTab,
  onTabChange,
  onClose,
  showCloseButton = true,
}: ContextOverviewHeaderProps) {
  return (
    <div className="relative flex flex-col px-8 py-6 border-b border-gray-700/30">
      {/* Top Row - Title and Close */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl backdrop-blur-sm border"
            style={{
              backgroundColor: `${groupColor}20`,
              borderColor: `${groupColor}40`,
              boxShadow: `0 0 10px ${groupColor}30`
            }}
          >
            <FileText className="w-6 h-6" style={{ color: groupColor }} />
          </div>
          <div className="flex-1">
            <motion.h4
              className="text-2xl font-bold font-mono bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${groupColor}, ${groupColor}80)`
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {contextName}
            </motion.h4>
            <motion.div
              className="flex items-center space-x-4 mt-2 text-sm text-gray-400 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center space-x-1">
                <FileText className="w-4 h-4" style={{ color: groupColor }} />
                <span>{fileCount} files</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" style={{ color: groupColor }} />
                <span>{createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </motion.button>
        )}
      </div>

      {/* Tab Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? 'text-white border-2'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
              }`}
              style={{
                backgroundColor: isActive ? `${groupColor}20` : undefined,
                borderColor: isActive ? groupColor : 'transparent',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? groupColor : undefined }} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
