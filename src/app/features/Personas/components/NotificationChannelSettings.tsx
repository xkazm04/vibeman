'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Hash, Send, Mail, Plus, X, Check, ChevronDown } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { NotificationChannel, NotificationChannelType, CredentialMetadata, ConnectorDefinition } from '@/app/features/Personas/lib/types';

interface NotificationChannelSettingsProps {
  personaId: string;
  credentials: CredentialMetadata[];
  connectorDefinitions: ConnectorDefinition[];
}

const channelTypes: Array<{ type: NotificationChannelType; label: string; icon: typeof Hash; configFields: Array<{ key: string; label: string; placeholder: string }> }> = [
  { type: 'slack', label: 'Slack', icon: Hash, configFields: [{ key: 'channel', label: 'Channel', placeholder: '#general' }] },
  { type: 'telegram', label: 'Telegram', icon: Send, configFields: [{ key: 'chat_id', label: 'Chat ID', placeholder: '123456789' }] },
  { type: 'email', label: 'Email', icon: Mail, configFields: [{ key: 'to', label: 'To Address', placeholder: 'user@example.com' }] },
];

function channelIcon(type: string) {
  switch (type) {
    case 'slack': return <Hash className="w-4 h-4 text-purple-400" />;
    case 'telegram': return <Send className="w-4 h-4 text-blue-400" />;
    case 'email': return <Mail className="w-4 h-4 text-amber-400" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground/50" />;
  }
}

export function NotificationChannelSettings({ personaId, credentials, connectorDefinitions }: NotificationChannelSettingsProps) {
  const fetchNotificationChannels = usePersonaStore((s) => s.fetchNotificationChannels);
  const updateNotificationChannels = usePersonaStore((s) => s.updateNotificationChannels);

  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadChannels = useCallback(async () => {
    const loaded = await fetchNotificationChannels(personaId);
    setChannels(loaded);
    setIsDirty(false);
  }, [personaId, fetchNotificationChannels]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleAddChannel = (type: NotificationChannelType) => {
    const newChannel: NotificationChannel = {
      id: `nc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      config: {},
      enabled: true,
    };
    setChannels([...channels, newChannel]);
    setIsDirty(true);
    setShowAddMenu(false);
  };

  const handleRemoveChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
    setIsDirty(true);
  };

  const handleToggleEnabled = (id: string) => {
    setChannels(channels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    setIsDirty(true);
  };

  const handleConfigChange = (id: string, key: string, value: string) => {
    setChannels(channels.map(c => c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c));
    setIsDirty(true);
  };

  const handleCredentialChange = (id: string, credentialId: string) => {
    setChannels(channels.map(c => c.id === id ? { ...c, credential_id: credentialId || undefined } : c));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateNotificationChannels(personaId, channels);
    setIsDirty(false);
    setIsSaving(false);
  };

  // Get matching credentials for a channel type
  const getMatchingCredentials = (type: string) => {
    // Find connector that matches this channel type
    const connectorName = type === 'email' ? 'gmail' : type;
    const connector = connectorDefinitions.find(c => c.name === connectorName);
    if (!connector) return credentials; // Show all if no specific connector
    return credentials.filter(c => c.service_type === connectorName);
  };

  const existingTypes = new Set(channels.map(c => c.type));

  return (
    <div className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notification Channels
        </h3>
      </div>

      <div className="space-y-3">
        {/* In-App (always present, read-only) */}
        <div className="flex items-center gap-3 p-2.5 bg-secondary/30 border border-primary/15 rounded-xl">
          <Bell className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium text-foreground/80 flex-1">In-App Messages</span>
          <span className="flex items-center gap-1 text-xs text-emerald-400/80">
            <Check className="w-3 h-3" />
            Always active
          </span>
        </div>

        {/* External channels */}
        {channels.map((channel) => {
          const typeDef = channelTypes.find(t => t.type === channel.type);
          const matchingCreds = getMatchingCredentials(channel.type);

          return (
            <div
              key={channel.id}
              className={`border rounded-xl p-2.5 space-y-2 transition-colors ${
                channel.enabled ? 'bg-secondary/30 border-primary/15' : 'bg-secondary/10 border-primary/15 opacity-60'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                {channelIcon(channel.type)}
                <span className="text-sm font-medium text-foreground/80 flex-1 capitalize">{channel.type}</span>

                {/* Enable/disable toggle */}
                <div
                  className={`w-8 h-5 rounded-full relative cursor-pointer transition-colors ${channel.enabled ? 'bg-emerald-500/80' : 'bg-muted-foreground/20'}`}
                  onClick={() => handleToggleEnabled(channel.id)}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${channel.enabled ? 'left-[14px]' : 'left-0.5'}`} />
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleRemoveChannel(channel.id)}
                  className="p-1 text-muted-foreground/40 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Config fields */}
              {typeDef?.configFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-[11px] font-mono text-muted-foreground/40 uppercase mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={channel.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(channel.id, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-2.5 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              ))}

              {/* Credential picker */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground/40 uppercase mb-1">Credential</label>
                <select
                  value={channel.credential_id || ''}
                  onChange={(e) => handleCredentialChange(channel.id, e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">Select credential...</option>
                  {matchingCreds.map((cred) => (
                    <option key={cred.id} value={cred.id}>{cred.name} ({cred.service_type})</option>
                  ))}
                </select>
                {channel.credential_id ? (
                  <span className="text-[10px] text-emerald-400/70 mt-0.5 block">Connected</span>
                ) : (
                  <span className="text-[10px] text-amber-400/70 mt-0.5 block">Credential needed</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Add channel button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/15 hover:border-primary/40 text-sm text-muted-foreground/60 hover:text-primary/80 transition-all w-full"
          >
            <Plus className="w-4 h-4" />
            Add Channel
            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
          </button>

          {showAddMenu && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-background border border-primary/15 rounded-xl shadow-lg z-10 overflow-hidden">
              {channelTypes
                .filter(t => !existingTypes.has(t.type))
                .map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.type}
                      onClick={() => handleAddChannel(t.type)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-secondary/50 text-sm text-foreground/80 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground/50" />
                      {t.label}
                    </button>
                  );
                })}
              {channelTypes.filter(t => !existingTypes.has(t.type)).length === 0 && (
                <div className="px-4 py-2.5 text-xs text-muted-foreground/50">All channel types added</div>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all"
          >
            {isSaving ? 'Saving...' : 'Save Channels'}
          </button>
        )}
      </div>
    </div>
  );
}
