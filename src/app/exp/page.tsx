'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, FileText } from 'lucide-react';
import ParliamentDashboard from './components/ParliamentDashboard';
import ProposalsDashboard from './components/ProposalsDashboard';
import { SecurityIntelligenceLayout } from '@/app/features/SecurityIntelligence';

type TabId = 'parliament' | 'security' | 'proposals';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'parliament',
    label: 'Parliament',
    icon: Users,
    description: 'Multi-Agent Debate System',
  },
  {
    id: 'security',
    label: 'Security Intelligence',
    icon: Shield,
    description: 'Vulnerability Monitoring',
  },
  {
    id: 'proposals',
    label: 'Proposals',
    icon: FileText,
    description: 'Proposal Management',
  },
];

export default function ExperimentalPage() {
  const [activeTab, setActiveTab] = useState<TabId>('parliament');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light text-white">Experimental Lab</h1>
          <p className="text-gray-400 text-sm">
            Test feature modules before integration
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-6 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }
                  `}
                  data-testid={`exp-tab-${tab.id}`}
                >
                  {/* Active background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg"
                      transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
                    />
                  )}

                  {/* Content */}
                  <div className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs opacity-70">{tab.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[600px]"
        >
          {activeTab === 'parliament' && <ParliamentDashboard />}
          {activeTab === 'security' && <SecurityIntelligenceLayout />}
          {activeTab === 'proposals' && <ProposalsDashboard />}
        </motion.div>
      </div>
    </div>
  );
}
