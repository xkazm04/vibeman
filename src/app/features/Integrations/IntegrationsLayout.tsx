'use client';

/**
 * Integrations Layout
 * Main layout for Integrations module in "Other" section
 * Tabbed interface: Connectors | Templates | Events
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, FileText, Activity } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { IntegrationsDashboard } from './IntegrationsDashboard';
import { TemplateDiscoveryPanel } from './sub_TemplateDiscovery/TemplateDiscoveryPanel';
import { EventsLog } from './components/EventsLog';

interface IntegrationsLayoutProps {
  projectId: string | null;
}

type TabType = 'connectors' | 'templates' | 'events';

const tabs = [
  { id: 'connectors' as const, label: 'Connectors', icon: Plug },
  { id: 'templates' as const, label: 'Template Discovery', icon: FileText },
  { id: 'events' as const, label: 'Events', icon: Activity },
];

function EmptyProjectState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
        <Plug className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">No Project Selected</h3>
      <p className="text-gray-500 max-w-md">
        Select a project from the dropdown above to manage integrations and templates.
      </p>
    </div>
  );
}

export default function IntegrationsLayout({ projectId: propProjectId }: IntegrationsLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('connectors');
  const { activeProject } = useActiveProjectStore();

  const projectId = propProjectId || activeProject?.id || null;
  const projectName = activeProject?.name;

  const renderContent = () => {
    if (!projectId) {
      return <EmptyProjectState />;
    }

    switch (activeTab) {
      case 'connectors':
        return <IntegrationsDashboard projectId={projectId} projectName={projectName} />;
      case 'templates':
        return <TemplateDiscoveryPanel />;
      case 'events':
        return <EventsLog projectId={projectId} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with tabs */}
      <div className="sticky top-24 z-30 bg-background/80 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Plug className="w-5 h-5 text-purple-400" />
              Integrations
            </h1>

            {/* Tab Navigation */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}
