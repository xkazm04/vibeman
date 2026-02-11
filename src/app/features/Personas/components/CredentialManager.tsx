'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Plus, Trash2, Key, ChevronDown, ChevronRight, Wrench, Zap, Pencil, Search, Plug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CredentialEditForm } from './CredentialEditForm';
import { CredentialEventConfig } from './CredentialEventConfig';
import { ConnectorDiscoveryModal } from './ConnectorDiscoveryModal';
import type { CredentialMetadata } from '@/app/features/Personas/lib/types';
import type { ConnectorDefinition } from '@/app/features/Personas/lib/types';

type ViewMode = 'list' | 'pick-type' | 'add-form';

export function CredentialManager() {
  const credentials = usePersonaStore((s) => s.credentials);
  const connectorDefinitions = usePersonaStore((s) => s.connectorDefinitions);
  const fetchCredentials = usePersonaStore((s) => s.fetchCredentials);
  const fetchConnectorDefinitions = usePersonaStore((s) => s.fetchConnectorDefinitions);
  const createCredential = usePersonaStore((s) => s.createCredential);
  const deleteCredential = usePersonaStore((s) => s.deleteCredential);
  const healthcheckCredential = usePersonaStore((s) => s.healthcheckCredential);

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorDefinition | null>(null);
  const [credentialName, setCredentialName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'edit' | 'services' | 'events'>('edit');
  const [discoveryOpen, setDiscoveryOpen] = useState(false);

  // Healthcheck state
  const [healthchecking, setHealthchecking] = useState<string | null>(null);
  const [healthcheckResults, setHealthcheckResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Edit mode for existing credentials
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCredentials(), fetchConnectorDefinitions()]);
      setLoading(false);
    };
    init();
  }, [fetchCredentials, fetchConnectorDefinitions]);

  const handlePickType = (connector: ConnectorDefinition) => {
    setSelectedConnector(connector);
    setCredentialName('');
    setViewMode('add-form');
  };

  const handleCreateCredential = async (values: Record<string, string>) => {
    if (!selectedConnector) return;

    const name = credentialName.trim() || `${selectedConnector.label} Credential`;

    try {
      await createCredential({
        name,
        service_type: selectedConnector.name,
        data: values,
      });
      await fetchCredentials();
      setViewMode('list');
      setSelectedConnector(null);
      setCredentialName('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create credential';
      alert(msg);
    }
  };

  const handleDelete = async (credentialId: string, force?: boolean) => {
    const confirmMsg = force
      ? 'This credential is in use. Are you sure you want to force-delete it? Personas using it will lose access.'
      : 'Are you sure you want to delete this credential?';
    if (!confirm(confirmMsg)) return;

    try {
      await deleteCredential(credentialId, force);
      if (expandedId === credentialId) {
        setExpandedId(null);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete credential';
      // If blocked because in use, offer force-delete
      if (msg.includes('Cannot delete credential')) {
        if (confirm(`${msg}\n\nForce delete anyway?`)) {
          await handleDelete(credentialId, true);
        }
      } else {
        alert(msg);
      }
    }
  };

  const handleHealthcheck = useCallback(async (credentialId: string) => {
    setHealthchecking(credentialId);
    try {
      const result = await healthcheckCredential(credentialId);
      setHealthcheckResults(prev => ({ ...prev, [credentialId]: result }));
    } finally {
      setHealthchecking(null);
    }
  }, [healthcheckCredential]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setExpandedSection('edit');
      setEditingId(null);
    }
  };

  const getConnectorForType = (type: string): ConnectorDefinition | undefined => {
    return connectorDefinitions.find(c => c.name === type);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Group connectors by category
  const groupedConnectors = connectorDefinitions.reduce<Record<string, ConnectorDefinition[]>>(
    (acc, c) => {
      const cat = c.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">Credentials</h3>
        {viewMode === 'list' && (
          <button
            onClick={() => setViewMode('pick-type')}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </button>
        )}
        {viewMode !== 'list' && (
          <button
            onClick={() => { setViewMode('list'); setSelectedConnector(null); }}
            className="px-4 py-2 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-sm transition-colors"
          >
            Back to List
          </button>
        )}
      </div>

      {/* Connector Type Picker */}
      <AnimatePresence mode="wait">
        {viewMode === 'pick-type' && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground/60">Select a service type:</p>
              <button
                onClick={() => setDiscoveryOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary/40 hover:bg-secondary/60 border border-primary/15 rounded-xl text-xs font-medium text-foreground/70 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Discover New
              </button>
            </div>

            {Object.entries(groupedConnectors).map(([category, connectors]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                  {category}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handlePickType(connector)}
                      className="group p-3 bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl hover:border-primary/30 hover:bg-secondary/60 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${connector.color}15`,
                            borderColor: `${connector.color}30`,
                          }}
                        >
                          {connector.icon_url ? (
                            <img src={connector.icon_url} alt={connector.label} className="w-5 h-5" />
                          ) : (
                            <Plug className="w-5 h-5" style={{ color: connector.color }} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                            {connector.label}
                          </h4>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground/40 mt-1">
                        {connector.fields.length} field{connector.fields.length !== 1 ? 's' : ''}
                        {connector.services.length > 0 && (
                          <span> &middot; {connector.services.length} service{connector.services.length !== 1 ? 's' : ''}</span>
                        )}
                        {connector.events.length > 0 && (
                          <span> &middot; {connector.events.length} event{connector.events.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Add Form */}
        {viewMode === 'add-form' && selectedConnector && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${selectedConnector.color}15`,
                  borderColor: `${selectedConnector.color}30`,
                }}
              >
                {selectedConnector.icon_url ? (
                  <img src={selectedConnector.icon_url} alt={selectedConnector.label} className="w-5 h-5" />
                ) : (
                  <Plug className="w-5 h-5" style={{ color: selectedConnector.color }} />
                )}
              </div>
              <div>
                <h4 className="font-medium text-foreground">New {selectedConnector.label} Credential</h4>
                <p className="text-xs text-muted-foreground/40">
                  {selectedConnector.healthcheck_config?.description || 'Configure credential fields'}
                </p>
              </div>
            </div>

            {/* Credential Name */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Credential Name
              </label>
              <input
                type="text"
                value={credentialName}
                onChange={(e) => setCredentialName(e.target.value)}
                placeholder={`My ${selectedConnector.label} Account`}
                className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>

            <CredentialEditForm
              fields={selectedConnector.fields}
              healthcheckDescription={selectedConnector.healthcheck_config?.description}
              onSave={handleCreateCredential}
              onCancel={() => { setViewMode('list'); setSelectedConnector(null); }}
            />
          </motion.div>
        )}

        {/* Credentials List */}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {credentials.map((credential: CredentialMetadata) => {
              const connector = getConnectorForType(credential.service_type);
              const isExpanded = expandedId === credential.id;

              return (
                <motion.div
                  key={credential.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-3 cursor-pointer hover:bg-secondary/60 transition-colors"
                    onClick={() => toggleExpand(credential.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border"
                          style={{
                            backgroundColor: connector ? `${connector.color}15` : undefined,
                            borderColor: connector ? `${connector.color}30` : undefined,
                          }}
                        >
                          {connector?.icon_url ? (
                            <img src={connector.icon_url} alt={connector.label} className="w-4 h-4" />
                          ) : connector ? (
                            <Plug className="w-4 h-4" style={{ color: connector.color }} />
                          ) : (
                            <Key className="w-4 h-4 text-emerald-400/80" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground text-sm">
                              {credential.name}
                            </h4>
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-md font-mono border"
                              style={{
                                backgroundColor: connector ? `${connector.color}15` : undefined,
                                borderColor: connector ? `${connector.color}25` : undefined,
                                color: connector?.color,
                              }}
                            >
                              {credential.service_type}
                            </span>
                          </div>

                          <div className="mt-1.5 text-xs text-muted-foreground/40 space-y-0.5">
                            <div>Created: {formatTimestamp(credential.created_at)}</div>
                            <div>Last Used: {formatTimestamp(credential.last_used_at)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(credential.id); }}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete credential"
                        >
                          <Trash2 className="w-4 h-4 text-red-400/70" />
                        </button>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground/40" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 border-t border-primary/15">
                          {/* Section Tabs */}
                          <div className="flex gap-1 pt-3 pb-3">
                            <button
                              onClick={() => setExpandedSection('edit')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                expandedSection === 'edit'
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : 'text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/60'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                            {connector && connector.services.length > 0 && (
                              <button
                                onClick={() => setExpandedSection('services')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  expandedSection === 'services'
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/60'
                                }`}
                              >
                                <Wrench className="w-3 h-3" />
                                Services ({connector.services.length})
                              </button>
                            )}
                            {connector && connector.events.length > 0 && (
                              <button
                                onClick={() => setExpandedSection('events')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  expandedSection === 'events'
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/60'
                                }`}
                              >
                                <Zap className="w-3 h-3" />
                                Events ({connector.events.length})
                              </button>
                            )}
                          </div>

                          {/* Edit Section */}
                          {expandedSection === 'edit' && connector && (
                            <div>
                              {editingId === credential.id ? (
                                <CredentialEditForm
                                  fields={connector.fields}
                                  healthcheckDescription={connector.healthcheck_config?.description}
                                  onSave={async (values) => {
                                    try {
                                      await fetch(`/api/personas/credentials/${credential.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          name: credential.name,
                                          service_type: credential.service_type,
                                          data: values,
                                        }),
                                      });
                                      await fetchCredentials();
                                      setEditingId(null);
                                    } catch {
                                      alert('Failed to update credential');
                                    }
                                  }}
                                  onCancel={() => setEditingId(null)}
                                  onHealthcheck={() => handleHealthcheck(credential.id)}
                                  isHealthchecking={healthchecking === credential.id}
                                  healthcheckResult={healthcheckResults[credential.id] || null}
                                />
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground/40">
                                      {connector.healthcheck_config?.description || 'Credential configuration'}
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleHealthcheck(credential.id)}
                                        disabled={healthchecking === credential.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                      >
                                        {healthchecking === credential.id ? (
                                          <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Key className="w-3 h-3" />
                                        )}
                                        Test Connection
                                      </button>
                                      <button
                                        onClick={() => setEditingId(credential.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/60 hover:bg-secondary border border-primary/15 text-foreground/70 rounded-lg text-xs font-medium transition-all"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        Edit Fields
                                      </button>
                                    </div>
                                  </div>

                                  {healthcheckResults[credential.id] && (
                                    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${
                                      healthcheckResults[credential.id].success
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    }`}>
                                      <span>{healthcheckResults[credential.id].success ? 'OK' : 'FAIL'}:</span>
                                      <span>{healthcheckResults[credential.id].message}</span>
                                    </div>
                                  )}

                                  {/* Show field names (not values - they're encrypted) */}
                                  <div className="space-y-1">
                                    {connector.fields.map((f) => (
                                      <div key={f.key} className="flex items-center gap-2 text-xs text-muted-foreground/40">
                                        <span className="font-mono text-muted-foreground/50">{f.key}</span>
                                        <span className="text-muted-foreground/20">-</span>
                                        <span>{f.label}</span>
                                        {f.required && <span className="text-amber-400/60">(required)</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Edit section fallback for no connector */}
                          {expandedSection === 'edit' && !connector && (
                            <div className="text-xs text-muted-foreground/40 py-2">
                              No connector definition available for this credential type.
                            </div>
                          )}

                          {/* Services Section */}
                          {expandedSection === 'services' && connector && (
                            <div className="space-y-2">
                              {connector.services.map((service) => (
                                <div
                                  key={service.toolName}
                                  className="flex items-center gap-3 p-3 bg-secondary/20 border border-primary/15 rounded-xl"
                                >
                                  <Wrench className="w-3.5 h-3.5 text-muted-foreground/40" />
                                  <div>
                                    <span className="text-sm text-foreground/80">{service.label}</span>
                                    <span className="ml-2 text-xs font-mono text-muted-foreground/30">{service.toolName}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Events Section */}
                          {expandedSection === 'events' && connector && (
                            <CredentialEventConfig
                              credentialId={credential.id}
                              serviceType={credential.service_type}
                              events={connector.events}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {credentials.length === 0 && (
              <div className="text-center py-10 text-muted-foreground/40 text-sm">
                No credentials configured yet
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Modal */}
      <ConnectorDiscoveryModal
        isOpen={discoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
      />
    </div>
  );
}
