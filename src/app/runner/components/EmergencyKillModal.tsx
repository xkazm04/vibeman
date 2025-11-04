import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap, Terminal, RefreshCw } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface ProcessInfo {
  port: number;
  pid: number | null;
  command?: string;
}

export default function EmergencyKillModal({
  isOpen,
  onClose,
  onRefresh
}: Props) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundProcesses, setFoundProcesses] = useState<ProcessInfo[]>([]);
  const [killResults, setKillResults] = useState<Record<number, string>>({});

  const scanForProcesses = async () => {
    setScanning(true);
    setFoundProcesses([]);
    setKillResults({});
    
    try {
      const response = await fetch('/api/server/debug/scan-ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ports: [3100, 3001, 3002, 3003, 3004, 3005] })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFoundProcesses(data.processes || []);
      }
    } catch {
      // Silent fail
    } finally {
      setScanning(false);
    }
  };

  const killProcess = async (port: number, pid: number | null) => {
    if (!pid) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/server/debug/kill-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, port })
      });
      
      const result = await response.json();
      setKillResults(prev => ({
        ...prev,
        [port]: result.success ? 'Killed successfully' : result.error || 'Failed to kill'
      }));
      
      // Refresh the scan after killing
      setTimeout(scanForProcesses, 1000);
    } catch {
      setKillResults(prev => ({
        ...prev,
        [port]: 'Network error'
      }));
    } finally {
      setLoading(false);
    }
  };

  const killAllProcesses = async () => {
    setLoading(true);
    for (const process of foundProcesses) {
      if (process.pid) {
        await killProcess(process.port, process.pid);
      }
    }
    setLoading(false);
  };

  const handleRefreshAndClose = () => {
    onRefresh();
    onClose();
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency Process Manager"
      subtitle="Detect and kill orphaned development servers"
      icon={AlertTriangle}
      iconBgColor="from-orange-600/20 to-red-600/20"
      iconColor="text-orange-400"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Scan Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-slate-600/5 rounded-xl" />
          <div className="relative p-4">
            <button
              onClick={scanForProcesses}
              disabled={scanning}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600/20 to-slate-600/20 hover:from-blue-600/30 hover:to-slate-600/30 disabled:from-blue-600/10 disabled:to-slate-600/10 text-blue-400 rounded-xl transition-all duration-200 border border-blue-600/30 hover:border-blue-600/50 disabled:border-blue-600/20 font-medium"
            >
              <Terminal className="w-5 h-5" />
              {scanning ? 'Scanning...' : 'Scan for Processes'}
            </button>
          </div>
        </div>

        {/* Results */}
        {foundProcesses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-300">Found Processes</h3>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={killAllProcesses}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 disabled:from-red-600/10 disabled:to-red-700/10 text-red-400 rounded-xl transition-all duration-200 border border-red-600/30 hover:border-red-600/50 disabled:border-red-600/20 font-medium"
              >
                <Zap className="w-4 h-4" />
                Kill All
              </motion.button>
            </div>
            
            <div className="space-y-3">
              {foundProcesses.map((process) => (
                <motion.div
                  key={process.port}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all duration-200"
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent rounded-xl" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />
                      <div className="text-sm">
                        <div className="text-white font-medium">Port {process.port}</div>
                        <div className="text-slate-400">
                          PID: {process.pid || 'Unknown'}
                          {process.command && (
                            <span className="ml-2 text-sm font-mono">
                              {process.command.substring(0, 50)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {killResults[process.port] && (
                        <span className={`text-sm px-3 py-1 rounded-lg border ${
                          killResults[process.port].includes('success')
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {killResults[process.port]}
                        </span>
                      )}
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => killProcess(process.port, process.pid)}
                        disabled={loading || !process.pid}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 disabled:from-red-600/10 disabled:to-red-700/10 text-red-400 rounded-lg transition-all duration-200 border border-red-600/30 hover:border-red-600/50 disabled:border-red-600/20 font-medium"
                      >
                        <Zap className="w-4 h-4" />
                        Kill
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {foundProcesses.length === 0 && !scanning && (
          <div className="text-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-700/20 rounded-2xl" />
              <div className="relative p-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                  <Terminal className="w-8 h-8 text-slate-400" />
                </div>
                                 <h3 className="text-lg font-medium text-slate-300 mb-2">No Processes Found</h3>
                 <p className="text-slate-500 text-sm">Click &quot;Scan for Processes&quot; to detect running servers</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-700/70 hover:to-slate-600/70 border border-slate-600/50 text-slate-300 rounded-xl transition-all duration-200 font-medium"
          >
            Close
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefreshAndClose}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-slate-600/20 hover:from-blue-600/30 hover:to-slate-600/30 border border-blue-600/30 text-blue-400 rounded-xl transition-all duration-200 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh & Close
          </motion.button>
        </div>
      </div>
    </UniversalModal>
  );
}; 