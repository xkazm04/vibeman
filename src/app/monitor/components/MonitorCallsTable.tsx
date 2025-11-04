'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MonitorCall, getStatusColor, formatTimestamp, formatDuration } from '../lib';
import { Phone, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

export default function MonitorCallsTable() {
  const [calls, setCalls] = useState<MonitorCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed' | 'abandoned'>('all');

  useEffect(() => {
    loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`/api/monitor/calls${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCalls(data.calls);
      }
    } catch (error) {
      // Error loading calls
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: MonitorCall['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'abandoned':
        return <AlertCircle className="w-4 h-4" />;
      case 'active':
      default:
        return <Loader className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Phone className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
              Call Monitoring
            </h2>
          </div>
          
          <button
            onClick={loadCalls}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 rounded-lg text-cyan-300 hover:from-cyan-500/40 hover:to-blue-500/40 transition-all duration-300 text-sm font-mono"
          >
            Refresh
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed', 'failed', 'abandoned'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono uppercase transition-all duration-200 ${
                filter === filterOption
                  ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {filterOption}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Call ID</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Started</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Intent</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-5 h-5 animate-spin text-cyan-400" />
                      <span className="text-sm font-mono">Loading calls...</span>
                    </div>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="text-sm font-mono">No calls to display</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Enable monitoring in voicebot tests to start tracking
                    </div>
                  </td>
                </tr>
              ) : (
                calls.map((call, index) => {
                  const statusColors = getStatusColor(call.status);
                  
                  return (
                    <motion.tr
                      key={call.callId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-cyan-400">{call.callId.substring(0, 20)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded ${statusColors.bg} border ${statusColors.border}`}>
                          <span className={statusColors.text}>{getStatusIcon(call.status)}</span>
                          <span className={`${statusColors.text} text-sm font-medium uppercase`}>
                            {call.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="font-mono text-sm">{formatTimestamp(call.startTime)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300 font-mono">
                          {call.duration ? formatDuration(call.duration) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{call.intent || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{call.outcome || '-'}</span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {!isLoading && calls.length > 0 && (
        <div className="p-4 border-t border-gray-800/50 bg-black/20">
          <div className="text-sm text-gray-400 font-mono">
            Showing {calls.length} {calls.length === 1 ? 'call' : 'calls'}
          </div>
        </div>
      )}
    </div>
  );
}
