'use client';

/**
 * Integrations Dashboard
 * Main view for managing external integrations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntegrationCard } from './components/IntegrationCard';
import { IntegrationForm } from './components/IntegrationForm';
import { EventsLog } from './components/EventsLog';
import type { IntegrationProvider, DbIntegration } from '@/app/db/models/integration.types';

interface ParsedIntegration extends Omit<DbIntegration, 'config' | 'enabled_events'> {
  config: Record<string, unknown>;
  enabled_events: string[];
}

interface IntegrationsDashboardProps {
  projectId: string;
  projectName?: string;
}

type ViewMode = 'grid' | 'events';

export function IntegrationsDashboard({ projectId, projectName }: IntegrationsDashboardProps) {
  const [integrations, setIntegrations] = useState<ParsedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<ParsedIntegration | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
    } catch (err) {
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
        // Refresh integrations to show updated status
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
      } else {
        alert(data.error || 'Failed to delete integration');
      }
    } catch {
      alert('Failed to delete integration');
    }
  };

  // Handle edit
  const handleEdit = (integration: ParsedIntegration) => {
    setEditingIntegration(integration);
    setShowForm(true);
  };

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false);
    setEditingIntegration(null);
  };

  // Handle form save
  const handleFormSave = () => {
    handleFormClose();
    fetchIntegrations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="integrations-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400" data-testid="integrations-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="integrations-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Integrations</h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect Vibeman to external services
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid="view-mode-grid-btn"
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
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
            data-testid="add-integration-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Integration
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="integrations-grid"
          >
            {integrations.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <p className="mb-4">No integrations configured yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-purple-400 hover:text-purple-300"
                  data-testid="empty-state-add-btn"
                >
                  Add your first integration
                </button>
              </div>
            ) : (
              integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onTest={handleTest}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
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

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <IntegrationForm
            projectId={projectId}
            integration={editingIntegration}
            onClose={handleFormClose}
            onSave={handleFormSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
