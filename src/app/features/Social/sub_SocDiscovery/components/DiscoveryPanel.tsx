'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { DiscoveryConfigList } from './DiscoveryConfigList';
import { DiscoveryConfigForm } from './DiscoveryConfigForm';
import { DiscoverySearch } from './DiscoverySearch';
import { TweetSelectionPanel } from './TweetSelectionPanel';

interface DiscoveryPanelProps {
  projectId: string;
}

type ViewMode = 'list' | 'create' | 'detail' | 'edit';

export function DiscoveryPanel({ projectId }: DiscoveryPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const discovery = useDiscovery({ projectId });

  const handleCreateNew = () => {
    discovery.setFormState({ name: '', query: '' });
    setViewMode('create');
  };

  const handleSelectConfig = (config: typeof discovery.selectedConfig) => {
    if (config) {
      discovery.selectConfig(config);
      setViewMode('detail');
    }
  };

  const handleSaveNew = async () => {
    await discovery.createConfig();
    setViewMode('detail');
  };

  const handleSaveEdit = async () => {
    await discovery.updateConfig();
    setViewMode('detail');
  };

  const handleStartEdit = () => {
    if (discovery.selectedConfig) {
      discovery.startEditing(discovery.selectedConfig);
      setViewMode('edit');
    }
  };

  const handleCancelEdit = () => {
    discovery.cancelEditing();
    setViewMode(discovery.selectedConfig ? 'detail' : 'list');
  };

  const handleBack = () => {
    discovery.selectConfig(null);
    setViewMode('list');
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Config List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-700/40 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-gray-200">Discovery</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Configure search patterns to discover content on X using Grok AI.
        </p>

        <DiscoveryConfigList
          configs={discovery.configs}
          selectedConfig={discovery.selectedConfig}
          isLoading={discovery.isLoadingConfigs}
          onSelect={handleSelectConfig}
          onDelete={discovery.deleteConfig}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Right Panel - Detail/Form */}
      <div className="flex-1 p-6 overflow-y-auto">
        {viewMode === 'list' && (
          <EmptyState onCreateNew={handleCreateNew} />
        )}

        {viewMode === 'create' && (
          <DiscoveryConfigForm
            formState={discovery.formState}
            setFormState={discovery.setFormState}
            isEditing={false}
            onSave={handleSaveNew}
            onCancel={handleCancelEdit}
            isNew
          />
        )}

        {viewMode === 'edit' && (
          <DiscoveryConfigForm
            formState={discovery.formState}
            setFormState={discovery.setFormState}
            isEditing={true}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {viewMode === 'detail' && discovery.selectedConfig && (
          <div className="space-y-6">
            {/* Search Section */}
            <DiscoverySearch
              config={discovery.selectedConfig}
              isSearching={discovery.isSearching}
              searchError={discovery.searchError}
              onSearch={discovery.executeSearch}
              onEdit={handleStartEdit}
            />

            {/* Results Section */}
            <div className="border-t border-gray-700/40 pt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                Search Results
              </h3>
              <TweetSelectionPanel
                tweets={discovery.searchResults}
                selectedTweets={discovery.selectedTweets}
                onToggleSelect={discovery.toggleTweetSelection}
                onSelectAll={discovery.selectAllTweets}
                onDeselectAll={discovery.deselectAllTweets}
                onSave={discovery.saveSelectedTweets}
                isSaving={discovery.isSaving}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center text-center"
    >
      <Compass className="w-16 h-16 text-gray-700 mb-4" />
      <h3 className="text-lg font-medium text-gray-300 mb-2">
        Discover Content on X
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        Create discovery configurations to search for relevant content on X.
        Grok AI will find matching tweets that you can save as feedback items.
      </p>
      <button
        onClick={onCreateNew}
        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400
          text-white font-medium transition-colors"
      >
        Create Your First Discovery
      </button>
    </motion.div>
  );
}
