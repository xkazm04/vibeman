'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Compass } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import DocsContextsLayout from '../features/Docs/DocsContextsLayout';
import DocsAnalysisLayout from '../features/Docs/sub_DocsAnalysis/DocsAnalysisLayout';

type TabType = 'contexts' | 'analysis';

const TABS: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'contexts', 
    label: 'Contexts', 
    icon: <FileText className="w-4 h-4" />,
    description: 'Browse documentation by context'
  },
  { 
    id: 'analysis', 
    label: 'Architecture Explorer', 
    icon: <Compass className="w-4 h-4" />,
    description: 'Interactive system architecture view'
  },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contexts');
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className={`w-8 h-8 ${colors.textDark}`} />
            <h1 className="text-4xl font-bold text-white font-mono">Documentation</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Browse and manage project documentation organized by contexts
          </p>
        </div>

        {/* Tab Menu */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-2 border border-gray-700/40 mb-6">
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? `${colors.bg} ${colors.text} border ${colors.borderHover}`
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={tab.description}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-700/40 overflow-hidden ${
          activeTab === 'analysis' ? 'h-[700px]' : ''
        }`}>
          {activeTab === 'contexts' && <DocsContextsLayout />}
          {activeTab === 'analysis' && <DocsAnalysisLayout />}
        </div>
      </div>
    </div>
  );
}
