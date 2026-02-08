'use client';

/**
 * Integrations Dashboard - Redesigned
 * Inline panel layout (no modals)
 * CompactList for integrations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plug, Plus, Check } from 'lucide-react';
import { IntegrationListColumn, type ParsedIntegration } from './components/IntegrationListColumn';
import { IntegrationDetailPanel } from './components/IntegrationDetailPanel';
import { EventsLog } from './components/EventsLog';

interface IntegrationsDashboardProps {
  projectId: string;
  projectName?: string;
}

type ViewMode = 'integrations' | 'events';

export function IntegrationsDashboard({ projectId, projectName }: IntegrationsDashboardProps) {
  const [integrations, setIntegrations] = useState<ParsedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<ParsedIntegration | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('integrations');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setIntegrations(data.integrations);
      } else {
        setError(data.error || 'Failed to load integrations');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Handle test connection
  const handleTest = async (id: string) => {
    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();

      if (data.success) {
        fetchIntegrations();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || data.message };
      }
    } catch {
      return { success: false, message: 'Failed to test connection' };
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/integrations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        fetchIntegrations();
        if (selectedIntegration?.id === id) {
          setSelectedIntegration(null);
        }
        setSuccessMessage('Integration deleted');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(data.error || 'Failed to delete integration');
      }
    } catch {
      alert('Failed to delete integration');
    }
  };

  // Handlers
  const handleSelectIntegration = (integration: ParsedIntegration) => {
    setIsCreating(false);
    setSelectedIntegration(integration);
  };

  const handleCreateNew = () => {
    setSelectedIntegration(null);
    setIsCreating(true);
  };

  const handleClosePanel = () => {
    setSelectedIntegration(null);
    setIsCreating(false);
  };

  const handleSaveIntegration = (savedIntegration: ParsedIntegration) => {
    fetchIntegrations();
    setSelectedIntegration(savedIntegration);
    setIsCreating(false);
    setSuccessMessage('Integration saved');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading && integrations.length === 0) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="integrations-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="integrations-dashboard">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-28 right-6 z-50 px-4 py-3 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-purple-400" />
            Integrations
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect Vibeman to external services
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('integrations')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'integrations'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-integrations-btn"
            >
              Integrations
            </button>
            <button
              onClick={() => setViewMode('events')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'events'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-events-btn"
            >
              Events Log
            </button>
          </div>

          {/* Add Integration Button */}
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-[0.97] text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/25"
            data-testid="add-integration-btn"
          >
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400" data-testid="integrations-error">
          {error}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'integrations' ? (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Integration List */}
            <div className="max-w-md">
              <IntegrationListColumn
                integrations={integrations}
                selectedIntegrationId={selectedIntegration?.id || null}
                onSelect={handleSelectIntegration}
                onDelete={handleDelete}
              />
            </div>

            {/* Detail Panel */}
            <AnimatePresence>
              {(selectedIntegration || isCreating) && (
                <IntegrationDetailPanel
                  integration={selectedIntegration}
                  isNew={isCreating}
                  projectId={projectId}
                  onClose={handleClosePanel}
                  onSave={handleSaveIntegration}
                  onTest={handleTest}
                />
              )}
            </AnimatePresence>

            {/* Empty State */}
            {integrations.length === 0 && !isCreating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center h-64 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/10">
                  <Plug className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2 tracking-tight">No integrations configured</h3>
                <p className="text-gray-500 max-w-md mb-4 leading-relaxed">
                  Connect Vibeman to external services like GitHub, Slack, Discord, Supabase, or PostgreSQL
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-[0.97] text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/25"
                  data-testid="empty-state-add-btn"
                >
                  <Plus className="w-4 h-4" />
                  Add your first integration
                </button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EventsLog projectId={projectId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
