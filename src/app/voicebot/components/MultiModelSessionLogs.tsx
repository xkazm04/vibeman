/**
 * Multi-Model Session Logs Component
 * Displays conversation logs with separate columns for each LLM model
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Activity, Trash2, Clock } from 'lucide-react';
import { LLMProvider } from '../lib/voicebotTypes';

type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

interface ModelResponse {
  provider: LLMProvider;
  model: string;
  response: string;
  audioUrl?: string;
  timing?: {
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  };
}

interface MultiModelLog {
  id: string;
  timestamp: string;
  question: string;
  responses: ModelResponse[];
}

interface MultiModelSessionLogsProps {
  logs: MultiModelLog[];
  sessionState: SessionState;
  activeModels: Array<{ provider: LLMProvider; model: string }>;
  onClearLogs: () => void;
}

export default function MultiModelSessionLogs({
  logs,
  sessionState,
  activeModels,
  onClearLogs
}: MultiModelSessionLogsProps) {
  
  const getProviderColor = (provider: LLMProvider) => {
    switch (provider) {
      case 'ollama':
        return { bg: 'from-purple-600/20 via-purple-600/10', border: 'border-purple-400/30', text: 'text-purple-400' };
      case 'openai':
        return { bg: 'from-green-600/20 via-green-600/10', border: 'border-green-400/30', text: 'text-green-400' };
      case 'anthropic':
        return { bg: 'from-orange-600/20 via-orange-600/10', border: 'border-orange-400/30', text: 'text-orange-400' };
      case 'gemini':
        return { bg: 'from-blue-600/20 via-blue-600/10', border: 'border-blue-400/30', text: 'text-blue-400' };
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
            Multi-Model Comparison
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <motion.div
                className={`w-2 h-2 rounded-full ${
                  sessionState === 'active' || sessionState === 'processing' ? 'bg-green-400' :
                  sessionState === 'connecting' ? 'bg-yellow-400' :
                  sessionState === 'error' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}
                animate={{
                  opacity: (sessionState === 'active' || sessionState === 'processing') ? [0.5, 1, 0.5] : 1,
                  scale: (sessionState === 'active' || sessionState === 'processing') ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: (sessionState === 'active' || sessionState === 'processing') ? Infinity : 0,
                }}
              />
              <span className="text-xs text-cyan-400/60 font-mono uppercase">
                {sessionState === 'active' || sessionState === 'processing' ? 'TESTING' : 
                 sessionState === 'connecting' ? 'CONNECTING' :
                 sessionState === 'error' ? 'ERROR' : 'OFFLINE'}
              </span>
            </div>

            {/* Clear Button */}
            <motion.button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              whileHover={{ scale: logs.length > 0 ? 1.05 : 1 }}
              whileTap={{ scale: logs.length > 0 ? 0.95 : 1 }}
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Active Models */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeModels.map((m, idx) => {
            const color = getProviderColor(m.provider);
            return (
              <div key={idx} className={`px-3 py-1 rounded-lg border ${color.border} bg-gradient-to-r ${color.bg} backdrop-blur-sm`}>
                <span className={`text-xs font-mono font-bold ${color.text}`}>
                  {m.provider.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400 ml-1">({m.model})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <Activity className="w-16 h-16 text-cyan-400/40 mb-4" />
            <p className="text-cyan-300/60 font-mono text-sm">Waiting for test to begin</p>
            <p className="text-gray-500 text-xs mt-2">Multi-model responses will appear here</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3"
              >
                {/* Question */}
                <div className="p-4 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-600/20 via-blue-600/10 to-cyan-800/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cyan-400 font-mono font-bold">USER QUESTION</span>
                    <span className="text-xs text-gray-500 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-white text-sm font-mono">{log.question}</p>
                </div>

                {/* Model Responses Grid */}
                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(activeModels.length, 4)} gap-3`}>
                  {log.responses.map((response, ridx) => {
                    const color = getProviderColor(response.provider);
                    return (
                      <motion.div
                        key={ridx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: ridx * 0.1 }}
                        className={`p-4 rounded-xl border ${color.border} bg-gradient-to-r ${color.bg} backdrop-blur-sm`}
                      >
                        {/* Model Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Bot className={`w-4 h-4 ${color.text}`} />
                            <span className={`text-xs font-mono font-bold ${color.text}`}>
                              {response.provider.toUpperCase()}
                            </span>
                          </div>
                          {response.timing && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400 font-mono">
                                {((response.timing.llmMs || 0) / 1000).toFixed(2)}s
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Response Text */}
                        <p className="text-white text-sm font-mono leading-relaxed break-words">
                          {response.response}
                        </p>

                        {/* Model Name */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          <span className="text-xs text-gray-400 font-mono">{response.model}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
