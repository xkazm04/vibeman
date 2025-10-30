import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';

interface SyncMetadata {
  table_name: string;
  last_sync_at: string | null;
  record_count: number;
  sync_status: string | null;
  error_message: string | null;
}

interface SupabaseStatus {
  configured: boolean;
  connected?: boolean;
  syncMetadata?: SyncMetadata[];
  error?: string;
  message?: string;
}

export default function SupabaseSync() {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch Supabase status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db-sync/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Supabase status:', error);
      setStatus({
        configured: false,
        error: 'Failed to check Supabase status'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);

      const response = await fetch('/api/db-sync/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopOnError: false })
      });

      const data = await response.json();
      setSyncResult(data);

      if (data.success) {
        // Refresh status to show updated sync metadata
        await fetchStatus();
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Determine status icon and color
  const getStatusIndicator = () => {
    if (loading) {
      return (
        <motion.div
          className="w-4 h-4 border-2 border-gray-400/30 border-t-blue-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      );
    }

    if (!status?.configured) {
      return <CloudOff className="w-4 h-4 text-gray-500" />;
    }

    if (status.connected) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, type: "spring" }}
        >
          <Cloud className="w-4 h-4 text-green-400" />
        </motion.div>
      );
    }

    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking connection...';
    if (!status?.configured) return 'Not configured - Set environment variables';
    if (status.connected) return 'Connected - Ready to sync';
    return status.error || 'Connection failed';
  };

  const getLastSyncTime = () => {
    if (!status?.syncMetadata || status.syncMetadata.length === 0) {
      return 'Never synced';
    }

    const timestamps = status.syncMetadata
      .map(m => m.last_sync_at)
      .filter(Boolean) as string[];

    if (timestamps.length === 0) return 'Never synced';

    const latest = timestamps.sort().reverse()[0];
    const date = new Date(latest);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <motion.div
      className="p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4" />
          Supabase Sync
        </span>
        {getStatusIndicator()}
      </div>

      {/* Status Text */}
      <p className="text-sm text-gray-400 leading-relaxed mb-3">
        {getStatusText()}
      </p>

      {/* Last Sync Time */}
      {status?.configured && status?.connected && (
        <p className="text-xs text-gray-500 mb-3">
          Last sync: {getLastSyncTime()}
        </p>
      )}

      {/* Sync Button */}
      {status?.configured && status?.connected && (
        <motion.button
          onClick={handleSync}
          disabled={syncing}
          className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            syncing
              ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600/80 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          }`}
          whileHover={syncing ? {} : { scale: 1.02 }}
          whileTap={syncing ? {} : { scale: 0.98 }}
        >
          <div className="flex items-center justify-center gap-2">
            {syncing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Push to Cloud
              </>
            )}
          </div>
        </motion.button>
      )}

      {/* Sync Result */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div
              className={`p-3 rounded-lg border ${
                syncResult.success
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-start gap-2">
                {syncResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${
                    syncResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {syncResult.success
                      ? `${syncResult.totalRecords} records synced`
                      : syncResult.error || 'An error occurred'
                    }
                  </p>

                  {syncResult.failedTables && syncResult.failedTables.length > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      Failed tables: {syncResult.failedTables.join(', ')}
                    </p>
                  )}

                  {/* Toggle details */}
                  {syncResult.results && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
                    >
                      {showDetails ? 'Hide' : 'Show'} details
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Results */}
              <AnimatePresence>
                {showDetails && syncResult.results && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1"
                  >
                    {syncResult.results.map((result: any) => (
                      <div
                        key={result.tableName}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className={result.success ? 'text-gray-300' : 'text-red-400'}>
                          {result.tableName}
                        </span>
                        <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                          {result.success
                            ? `${result.recordCount} records`
                            : 'Failed'
                          }
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Help */}
      {!status?.configured && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30"
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            To enable cloud sync, add these environment variables to your <code className="text-blue-400">.env.local</code>:
          </p>
          <pre className="mt-2 text-xs text-gray-300 font-mono overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...`}
          </pre>
        </motion.div>
      )}
    </motion.div>
  );
}
