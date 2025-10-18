'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader, TrendingUp } from 'lucide-react';

interface Pattern {
  patternId: string;
  patternType: 'flow' | 'decision' | 'failure';
  description?: string;
  frequency: number;
}

export default function MonitorPatternsTable() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/monitor/patterns');
      const data = await response.json();

      if (data.success && data.patterns) {
        setPatterns(data.patterns);
      }
    } catch (error) {
      console.error('Failed to load patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'flow':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'decision':
        return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      case 'failure':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 p-8 text-center">
        <Loader className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
        <div className="text-gray-400 font-mono text-sm">Loading patterns...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-purple-600/10 to-cyan-600/20">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
            Conversation Patterns
          </h2>
        </div>
        <p className="text-sm text-gray-400 mt-1 font-mono">
          Detected patterns across {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">
                Pattern Type
              </th>
              <th className="px-6 py-3 text-left text-gray-300 font-medium text-xs uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-gray-300 font-medium text-xs uppercase tracking-wider">
                Frequency
              </th>
            </tr>
          </thead>
          <tbody>
            {patterns.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                  <div className="text-sm font-mono">No patterns detected yet</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Patterns will appear after running evaluations
                  </div>
                </td>
              </tr>
            ) : (
              patterns.map((pattern, index) => (
                <motion.tr
                  key={pattern.patternId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getTypeColor(pattern.patternType)}`}>
                      {pattern.patternType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">
                      {pattern.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-600/20 border border-cyan-500/30 rounded-lg">
                      <span className="text-cyan-300 font-bold font-mono">
                        {pattern.frequency}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
