'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Save, AlertTriangle, AlertCircle, FileText, Play, Settings, X, Bot } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { EditorTab } from '@/app/features/Personas/lib/types';
import { PersonaPromptEditor } from './PersonaPromptEditor';
import { ExecutionList } from './ExecutionList';
import { PersonaRunner } from './PersonaRunner';
import { NotificationChannelSettings } from './NotificationChannelSettings';

const tabDefs: Array<{ id: EditorTab; label: string; icon: typeof FileText }> = [
  { id: 'prompt', label: 'Prompt', icon: FileText },
  { id: 'executions', label: 'Executions', icon: Play },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function PersonaEditor() {
  const selectedPersona = usePersonaStore((s) => s.selectedPersona);
  const editorTab = usePersonaStore((s) => s.editorTab);
  const setEditorTab = usePersonaStore((s) => s.setEditorTab);
  const updatePersona = usePersonaStore((s) => s.updatePersona);
  const deletePersona = usePersonaStore((s) => s.deletePersona);
  const credentials = usePersonaStore((s) => s.credentials);
  const connectorDefinitions = usePersonaStore((s) => s.connectorDefinitions);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedIcon, setEditedIcon] = useState('');
  const [editedColor, setEditedColor] = useState('#8b5cf6');
  const [editedMaxConcurrent, setEditedMaxConcurrent] = useState(1);
  const [editedTimeout, setEditedTimeout] = useState(300000);
  const [editedEnabled, setEditedEnabled] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);

  useEffect(() => {
    if (selectedPersona) {
      setEditedName(selectedPersona.name);
      setEditedDescription(selectedPersona.description || '');
      setEditedIcon(selectedPersona.icon || '');
      setEditedColor(selectedPersona.color || '#8b5cf6');
      setEditedMaxConcurrent(selectedPersona.max_concurrent || 1);
      setEditedTimeout(selectedPersona.timeout_ms || 300000);
      setEditedEnabled(!!selectedPersona.enabled);
      setSettingsDirty(false);
    }
  }, [selectedPersona?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute readiness: persona can only be enabled if it has triggers and all tool credentials
  const readiness = useMemo(() => {
    if (!selectedPersona) return { canEnable: false, reasons: [] as string[] };
    const reasons: string[] = [];
    const triggers = selectedPersona.triggers || [];
    if (triggers.length === 0) {
      reasons.push('No triggers configured');
    }
    const tools = selectedPersona.tools || [];
    const credTypes = new Set(credentials.map((c) => c.service_type));
    const missingCreds = tools
      .filter((t) => t.requires_credential_type && !credTypes.has(t.requires_credential_type))
      .map((t) => t.requires_credential_type!);
    const uniqueMissing = [...new Set(missingCreds)];
    if (uniqueMissing.length > 0) {
      reasons.push(`Missing credentials: ${uniqueMissing.join(', ')}`);
    }
    return { canEnable: reasons.length === 0, reasons };
  }, [selectedPersona, credentials]);

  const [showReadinessTooltip, setShowReadinessTooltip] = useState(false);

  const handleHeaderToggle = async () => {
    if (!selectedPersona) return;
    const nextEnabled = !selectedPersona.enabled;
    // Block enabling if not ready
    if (nextEnabled && !readiness.canEnable) {
      setShowReadinessTooltip(true);
      setTimeout(() => setShowReadinessTooltip(false), 3000);
      return;
    }
    await updatePersona(selectedPersona.id, { enabled: nextEnabled });
  };

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const handleSaveSettings = async () => {
    await updatePersona(selectedPersona.id, {
      name: editedName,
      description: editedDescription || null,
      icon: editedIcon || null,
      color: editedColor || null,
      max_concurrent: editedMaxConcurrent,
      timeout_ms: editedTimeout,
      enabled: editedEnabled,
    });
    setSettingsDirty(false);
  };

  const handleDelete = async () => {
    await deletePersona(selectedPersona.id);
    setShowDeleteConfirm(false);
  };

  const markDirty = () => setSettingsDirty(true);

  const renderTabContent = () => {
    switch (editorTab) {
      case 'prompt':
        return <PersonaPromptEditor />;
      case 'executions':
        return (
          <div className="space-y-6">
            <PersonaRunner />
            <ExecutionList />
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl space-y-4">
            {/* Identity */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2.5 text-sm font-semibold text-foreground/70 tracking-wide">
                <span className="w-6 h-[2px] bg-gradient-to-r from-primary to-accent rounded-full" />
                Identity
              </h4>
              <div className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-xl p-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/60 mb-1">Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => { setEditedName(e.target.value); markDirty(); }}
                    className="w-full px-3 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/60 mb-1">Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => { setEditedDescription(e.target.value); markDirty(); }}
                    rows={2}
                    className="w-full px-3 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/60 mb-2">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {connectorDefinitions
                      .filter((c) => c.icon_url)
                      .map((c) => {
                        const isSelected = editedIcon === c.icon_url;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setEditedIcon(c.icon_url!); markDirty(); }}
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/30 scale-110 bg-primary/10'
                                : 'border-primary/15 bg-background/50 hover:bg-secondary/60 hover:border-primary/30'
                            }`}
                            title={c.label}
                          >
                            <img src={c.icon_url!} alt={c.label} className="w-4.5 h-4.5" />
                          </button>
                        );
                      })}
                    {['\u{1F916}', '\u{1F9E0}', '\u{26A1}', '\u{1F527}', '\u{1F4E7}', '\u{1F4CA}', '\u{1F6E1}\u{FE0F}', '\u{1F50D}'].map((emoji) => {
                      const isSelected = editedIcon === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => { setEditedIcon(emoji); markDirty(); }}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/30 scale-110 bg-primary/10'
                              : 'border-primary/15 bg-background/50 hover:bg-secondary/60 hover:border-primary/30'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                    {editedIcon && (
                      <button
                        type="button"
                        onClick={() => { setEditedIcon(''); markDirty(); }}
                        className="w-9 h-9 rounded-lg border border-dashed border-primary/20 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/60 hover:border-primary/30 transition-all"
                        title="Clear icon"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/60 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editedColor}
                      onChange={(e) => { setEditedColor(e.target.value); markDirty(); }}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-primary/15 bg-transparent"
                    />
                    <span className="text-sm font-mono text-muted-foreground/40">{editedColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2.5 text-sm font-semibold text-foreground/70 tracking-wide">
                <span className="w-6 h-[2px] bg-gradient-to-r from-primary to-accent rounded-full" />
                Execution
              </h4>
              <div className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-xl p-3 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground/60 mb-1">Max Concurrent</label>
                    <input
                      type="number"
                      value={editedMaxConcurrent}
                      onChange={(e) => { setEditedMaxConcurrent(parseInt(e.target.value, 10) || 1); markDirty(); }}
                      min={1}
                      max={10}
                      className="w-full px-3 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground/60 mb-1">Timeout (sec)</label>
                    <input
                      type="number"
                      value={Math.round(editedTimeout / 1000)}
                      onChange={(e) => { setEditedTimeout((parseInt(e.target.value, 10) || 300) * 1000); markDirty(); }}
                      min={10}
                      step={10}
                      className="w-full px-3 py-1.5 bg-background/50 border border-primary/15 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-foreground/60">Persona Enabled</span>
                  <div
                    className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${editedEnabled ? 'bg-emerald-500/80' : 'bg-muted-foreground/20'}`}
                    onClick={() => { setEditedEnabled(!editedEnabled); markDirty(); }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editedEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Channels */}
            {selectedPersona && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2.5 text-sm font-semibold text-foreground/70 tracking-wide">
                  <span className="w-6 h-[2px] bg-gradient-to-r from-primary to-accent rounded-full" />
                  Notifications
                </h4>
                <NotificationChannelSettings
                  personaId={selectedPersona.id}
                  credentials={credentials}
                  connectorDefinitions={connectorDefinitions}
                />
              </div>
            )}

            {/* Save + Danger */}
            <div className="flex items-center justify-between pt-2 border-t border-primary/10">
              <button
                onClick={handleSaveSettings}
                disabled={!settingsDirty}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  settingsDirty
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-accent/90'
                    : 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400/70 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Irreversible
                  </span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-secondary/50 text-foreground/60 rounded-lg text-sm transition-colors hover:bg-secondary/70"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-primary/10 bg-secondary/40 backdrop-blur-md px-6 py-3">
        <div className="flex items-center gap-3">
          {selectedPersona.icon ? (
            selectedPersona.icon.startsWith('http') ? (
              <img src={selectedPersona.icon} alt="" className="w-6 h-6" />
            ) : (
              <span className="text-2xl">{selectedPersona.icon}</span>
            )
          ) : null}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground">{selectedPersona.name}</h1>
            {selectedPersona.description && (
              <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">{selectedPersona.description}</p>
            )}
          </div>

          {/* Enable/disable toggle */}
          <div className="relative flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium transition-colors ${selectedPersona.enabled ? 'text-emerald-400' : 'text-muted-foreground/40'}`}>
              {selectedPersona.enabled ? 'Active' : 'Off'}
            </span>
            <button
              onClick={handleHeaderToggle}
              className={`w-11 h-6 rounded-full relative transition-all ${
                selectedPersona.enabled
                  ? 'bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : !readiness.canEnable
                    ? 'bg-muted-foreground/15 cursor-not-allowed'
                    : 'bg-muted-foreground/20 hover:bg-muted-foreground/30'
              }`}
              title={!readiness.canEnable && !selectedPersona.enabled ? readiness.reasons.join('; ') : undefined}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${selectedPersona.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>

            {/* Readiness tooltip */}
            <AnimatePresence>
              {showReadinessTooltip && readiness.reasons.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-background border border-amber-500/30 rounded-lg shadow-xl p-2.5 z-50"
                >
                  <p className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Cannot enable persona
                  </p>
                  {readiness.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground/60 pl-5">
                      {r}
                    </p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-primary/10 bg-primary/5">
        <div className="flex overflow-x-auto px-6 gap-1">
          {tabDefs.map((tab) => {
            const Icon = tab.icon;
            const isActive = editorTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEditorTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="personaEditorTab"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
