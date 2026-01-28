'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Database,
  Smartphone,
  Trash2,
} from 'lucide-react';

interface RemoteStatus {
  is_configured: boolean;
  is_connected: boolean;
  supabase_url: string | null;
  last_validated_at: string | null;
  pending_commands: number;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  error?: string;
  tables_found?: {
    vibeman_clients: boolean;
    vibeman_events: boolean;
    vibeman_commands: boolean;
  };
}

interface RemoteSetupPanelProps {
  onConfigChange?: () => void;
}

export default function RemoteSetupPanel({ onConfigChange }: RemoteSetupPanelProps) {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
  });

  // Fetch current status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/remote/setup/status');
      const data = await response.json();
      setStatus(data);

      // Auto-expand if not configured
      if (!data.is_configured) {
        setIsExpanded(true);
      }
    } catch (err) {
      console.error('Failed to fetch remote status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/remote/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: SetupResponse = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || 'Configuration saved successfully');
        setFormData({ supabase_url: '', supabase_anon_key: '', supabase_service_role_key: '' });
        setIsExpanded(false);
        await fetchStatus();
        onConfigChange?.();
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Test with current form data (doesn't save)
      const response = await fetch('/api/remote/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: SetupResponse = await response.json();

      if (data.success) {
        setSuccessMessage('Connection successful! All required tables found.');
        await fetchStatus();
        onConfigChange?.();
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to remove the remote configuration?')) return;

    try {
      const response = await fetch('/api/remote/setup', { method: 'DELETE' });
      if (response.ok) {
        setSuccessMessage('Configuration removed');
        setIsExpanded(true);
        await fetchStatus();
        onConfigChange?.();
      }
    } catch (err) {
      setError('Failed to remove configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking remote configuration...</span>
        </div>
      </div>
    );
  }

  // Configured state - show status card
  if (status?.is_configured && !isExpanded) {
    return (
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/20 rounded">
              <Smartphone className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <span className="text-sm font-medium text-green-400">Multi-Device Sync</span>
              <p className="text-xs text-gray-500">Butler connection enabled</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Edit configuration"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleDisconnect}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
              title="Remove configuration"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-black/20 rounded">
            <span className="text-gray-500">Status</span>
            <div className="flex items-center gap-1 mt-1">
              {status.is_connected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-yellow-400">Configured</span>
                </>
              )}
            </div>
          </div>
          <div className="p-2 bg-black/20 rounded">
            <span className="text-gray-500">Project</span>
            <p className="text-gray-300 mt-1 truncate">
              {status.supabase_url || 'Not set'}
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
            {successMessage}
          </div>
        )}
      </div>
    );
  }

  // Setup form
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => status?.is_configured && setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 rounded">
            <Smartphone className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-gray-200">Multi-Device Sync Setup</span>
            <p className="text-xs text-gray-500">Connect Butler mobile app via Supabase</p>
          </div>
        </div>
        {!status?.is_configured && (
          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
            Not configured
          </span>
        )}
      </button>

      {/* Form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Instructions */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-300 mb-2 font-medium">Setup Instructions:</p>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Run the migration SQL (see docs/butler-vibeman-integration-guide.md)</li>
                  <li>Copy your credentials below and click Test Connection</li>
                </ol>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={formData.supabase_url}
                    onChange={(e) => setFormData({ ...formData, supabase_url: e.target.value })}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Anon Key (public)
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys ? 'text' : 'password'}
                      value={formData.supabase_anon_key}
                      onChange={(e) => setFormData({ ...formData, supabase_anon_key: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-700 rounded text-sm focus:border-cyan-500 focus:outline-none font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                    >
                      {showKeys ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Service Role Key (secret - for table validation)
                  </label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={formData.supabase_service_role_key}
                    onChange={(e) => setFormData({ ...formData, supabase_service_role_key: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:border-cyan-500 focus:outline-none font-mono text-xs"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Required to validate required tables exist
                  </p>
                </div>
              </div>

              {/* Error/Success messages */}
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!formData.supabase_url || !formData.supabase_anon_key || !formData.supabase_service_role_key || isTesting || isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm font-medium text-gray-200 disabled:opacity-50 transition-all"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>

                {status?.is_configured && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
