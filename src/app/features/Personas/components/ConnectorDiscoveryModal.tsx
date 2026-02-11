'use client';

import { useState } from 'react';
import { X, Search, Check, Loader2, Plug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectorDiscovery } from '@/app/features/Personas/hooks/useConnectorDiscovery';
import { DesignTerminal } from './DesignTerminal';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ConnectorDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = ['Jira', 'Discord', 'Notion', 'Trello', 'Linear', 'Asana', 'Confluence', 'Telegram', 'Twilio', 'SendGrid'];

export function ConnectorDiscoveryModal({ isOpen, onClose }: ConnectorDiscoveryModalProps) {
  const [serviceName, setServiceName] = useState('');
  const [context, setContext] = useState('');

  const {
    phase,
    outputLines,
    result,
    error,
    startDiscovery,
    saveConnector,
    cancel,
    reset,
  } = useConnectorDiscovery();

  const handleStart = () => {
    if (!serviceName.trim()) return;
    startDiscovery(serviceName.trim(), context.trim() || undefined);
  };

  const handleClose = () => {
    reset();
    setServiceName('');
    setContext('');
    onClose();
  };

  const handleSave = async () => {
    await saveConnector();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl max-h-[85vh] bg-background border border-border/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-2.5">
            <Plug className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Discover New Connector</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-secondary/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <AnimatePresence mode="wait">
            {/* Idle: Input form */}
            {phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g., Jira, Discord, Notion..."
                    className="w-full px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStart();
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setServiceName(s)}
                        className="px-2.5 py-1 text-xs bg-secondary/40 hover:bg-secondary/60 border border-border/20 rounded-lg text-muted-foreground/60 hover:text-foreground/70 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Additional Context <span className="text-muted-foreground/40">(optional)</span>
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g., We use Jira Cloud at company.atlassian.net"
                    className="w-full h-20 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl text-foreground text-sm placeholder-muted-foreground/30 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 px-1">{error}</p>
                )}

                <button
                  onClick={handleStart}
                  disabled={!serviceName.trim()}
                  className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-medium text-sm transition-all w-full ${
                    !serviceName.trim()
                      ? 'bg-secondary/60 text-muted-foreground/40 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg shadow-primary/20'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Discover Connector
                </button>
              </motion.div>
            )}

            {/* Discovering: Terminal output */}
            {phase === 'discovering' && (
              <motion.div
                key="discovering"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="bg-secondary/30 rounded-xl px-4 py-3 text-sm text-foreground/70">
                  Researching: {serviceName}
                </div>
                <DesignTerminal lines={outputLines} isRunning={true} />
                <button
                  onClick={cancel}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Preview: Result display */}
            {phase === 'preview' && result && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Connector Info */}
                <div className="flex items-center gap-3 p-4 bg-secondary/30 border border-border/20 rounded-2xl">
                  {result.connector.icon_url ? (
                    <img
                      src={result.connector.icon_url}
                      alt={result.connector.label}
                      className="w-10 h-10"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${result.connector.color}20` }}
                    >
                      <Plug className="w-5 h-5" style={{ color: result.connector.color }} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-foreground">{result.connector.label}</h3>
                    <p className="text-xs text-muted-foreground/50">
                      {result.connector.category} &middot;{' '}
                      {result.connector.fields.length} fields &middot;{' '}
                      {result.connector.services.length} services &middot;{' '}
                      {result.connector.events.length} events
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-foreground/70">{result.summary}</p>

                {/* Fields preview */}
                <div className="space-y-1">
                  <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider">Fields</h4>
                  {result.connector.fields.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 text-xs text-muted-foreground/50">
                      <span className="font-mono">{f.key}</span>
                      <span className="text-muted-foreground/20">-</span>
                      <span>{f.label}</span>
                      {f.required && <span className="text-amber-400/60">(required)</span>}
                    </div>
                  ))}
                </div>

                {/* Setup Instructions */}
                {result.setup_instructions && (
                  <div className="max-h-48 overflow-y-auto bg-secondary/20 border border-border/30 rounded-xl p-4">
                    <MarkdownRenderer content={result.setup_instructions} />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 px-1">{error}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Add Connector
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-muted-foreground hover:text-foreground/60 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </motion.div>
            )}

            {/* Saving */}
            {phase === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground/60">Saving connector...</span>
              </motion.div>
            )}

            {/* Saved */}
            {phase === 'saved' && (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm text-emerald-400 font-medium">
                  Connector added successfully!
                </span>
                <button
                  onClick={handleClose}
                  className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary/50 text-foreground/70 hover:bg-secondary/70 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
