import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Zap, Terminal, RefreshCw } from 'lucide-react';

interface EmergencyKillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface ProcessInfo {
  port: number;
  pid: number | null;
  command?: string;
}

export const EmergencyKillModal: React.FC<EmergencyKillModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
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
        body: JSON.stringify({ ports: [3000, 3001, 3002, 3003, 3004, 3005] })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFoundProcesses(data.processes || []);
      }
    } catch (error) {
      console.error('Failed to scan for processes:', error);
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
    } catch (error) {
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Emergency Process Manager</h2>
                  <p className="text-sm text-gray-400">Detect and kill orphaned development servers</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Scan Section */}
            <div className="mb-6">
              <button
                onClick={scanForProcesses}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
              >
                <Terminal className="w-4 h-4" />
                {scanning ? 'Scanning...' : 'Scan for Processes'}
              </button>
            </div>

            {/* Results */}
            {foundProcesses.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-white">Found Processes</h3>
                  <button
                    onClick={killAllProcesses}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-sm rounded-lg transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Kill All
                  </button>
                </div>
                
                <div className="space-y-2">
                  {foundProcesses.map((process) => (
                    <div
                      key={process.port}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="text-white font-medium">Port {process.port}</div>
                          <div className="text-gray-400">
                            PID: {process.pid || 'Unknown'}
                            {process.command && (
                              <span className="ml-2 text-xs font-mono">
                                {process.command.substring(0, 50)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {killResults[process.port] && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            killResults[process.port].includes('success')
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {killResults[process.port]}
                          </span>
                        )}
                        
                        <button
                          onClick={() => killProcess(process.port, process.pid)}
                          disabled={loading || !process.pid}
                          className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-xs rounded transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Kill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No processes found */}
            {foundProcesses.length === 0 && !scanning && (
              <div className="text-center py-8 text-gray-400">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No processes found on common development ports</p>
                <p className="text-sm">Click "Scan for Processes" to check for running servers</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500">
                Scans ports 3000-3005 for development servers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefreshAndClose}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh & Close
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 