'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle } from 'lucide-react';
import type { SocialChannelType, SocialChannelConfigResponse } from '../lib/types';
import { ChannelSelector } from './ChannelIcon';
import { ConfigList } from './ConfigList';
import { ConfigForm } from './ConfigForm';

interface ConfigurationPanelProps {
  projectId: string;
}

export function ConfigurationPanel({ projectId }: ConfigurationPanelProps) {
  // State
  const [configs, setConfigs] = useState<SocialChannelConfigResponse[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SocialChannelType | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load configs
  const loadConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/social/config?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load configurations');
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Calculate channel counts
  const channelCounts: Record<SocialChannelType, number> = {
    instagram: configs.filter((c) => c.channelType === 'instagram').length,
    facebook: configs.filter((c) => c.channelType === 'facebook').length,
    x: configs.filter((c) => c.channelType === 'x').length,
    gmail: configs.filter((c) => c.channelType === 'gmail').length,
    discord: configs.filter((c) => c.channelType === 'discord').length,
  };

  // Handlers
  const handleSelectChannel = (channel: SocialChannelType) => {
    setSelectedChannel(channel === selectedChannel ? null : channel);
    setSelectedConfigId(null);
    setIsAddingNew(false);
  };

  const handleSelectConfig = (config: SocialChannelConfigResponse) => {
    setSelectedConfigId(config.id);
    setSelectedChannel(config.channelType);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    if (!selectedChannel) {
      // If no channel selected, select the first one
      setSelectedChannel('instagram');
    }
    setSelectedConfigId(null);
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setSelectedConfigId(null);
  };

  const handleSave = async (data: {
    name: string;
    credentials: Record<string, string>;
    config: Record<string, any>;
  }) => {
    try {
      if (selectedConfigId) {
        // Update existing
        const response = await fetch(`/api/social/config/${selectedConfigId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            credentials: data.credentials,
            config: data.config,
          }),
        });
        if (!response.ok) throw new Error('Failed to update configuration');
      } else {
        // Create new
        const response = await fetch('/api/social/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            channelType: selectedChannel,
            name: data.name,
            credentials: data.credentials,
            config: data.config,
          }),
        });
        if (!response.ok) throw new Error('Failed to create configuration');
      }

      await loadConfigs();
      setIsAddingNew(false);
      setSelectedConfigId(null);
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  const handleTest = async (credentials: Record<string, string>) => {
    const response = await fetch('/api/social/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelType: selectedChannel,
        credentials,
        configId: selectedConfigId,
      }),
    });

    const data = await response.json();
    return data;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/social/config/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete configuration');

      await loadConfigs();
      if (selectedConfigId === id) {
        setSelectedConfigId(null);
        setIsAddingNew(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const selectedConfig = selectedConfigId
    ? configs.find((c) => c.id === selectedConfigId)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Selector */}
      <div className="mb-4">
        <ChannelSelector
          selectedChannel={selectedChannel}
          channelCounts={channelCounts}
          onSelect={handleSelectChannel}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Config List */}
        <ConfigList
          configs={configs}
          selectedConfigId={selectedConfigId}
          selectedChannel={selectedChannel}
          onSelectConfig={handleSelectConfig}
          onAddNew={handleAddNew}
          onDelete={handleDelete}
        />

        {/* Right: Config Form or Empty State */}
        <AnimatePresence mode="wait">
          {(isAddingNew || selectedConfigId) && selectedChannel ? (
            <ConfigForm
              key={selectedConfigId || 'new'}
              channelType={selectedChannel}
              existingConfig={selectedConfig}
              onSave={handleSave}
              onTest={handleTest}
              onCancel={handleCancel}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 bg-gray-900/40 rounded-xl border border-gray-700/40 flex items-center justify-center"
            >
              <div className="text-center">
                <Settings className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-400 mb-1">
                  {selectedChannel
                    ? 'Select a configuration to edit'
                    : 'Select a channel to get started'}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedChannel
                    ? 'Or click + to add a new one'
                    : 'Click on a channel icon above'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ConfigurationPanel;
