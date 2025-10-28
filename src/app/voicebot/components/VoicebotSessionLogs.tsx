'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Activity, Trash2, Clock } from 'lucide-react';
import { SessionLog } from '../lib/voicebotTypes';

type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

interface VoicebotSessionLogsProps {
  logs: SessionLog[];
  sessionState: SessionState;
  isListening: boolean;
  onClearLogs: () => void;
}

export default function VoicebotSessionLogs({
  logs,
  sessionState,
  isListening,
  onClearLogs
}: VoicebotSessionLogsProps) {
  
  const getLogStyle = (type: string) => {
    switch (type) {
      case 'user':
        return {
          bg: 'bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-blue-800/20',
          border: 'border-cyan-400/30',
          icon: User,
          iconColor: 'text-cyan-400',
          dotColor: 'bg-cyan-400',
          label: 'YOU',
          labelColor: 'text-cyan-300'
        };
      case 'assistant':
        return {
          bg: 'bg-gradient-to-r from-green-600/20 via-emerald-600/10 to-green-800/20',
          border: 'border-green-400/30',
          icon: Bot,
          iconColor: 'text-green-400',
          dotColor: 'bg-green-400',
          label: 'AI ASSISTANT',
          labelColor: 'text-green-300'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-600/20 via-slate-600/10 to-gray-800/20',
          border: 'border-gray-400/30',
          icon: Activity,
          iconColor: 'text-gray-400',
          dotColor: 'bg-gray-400',
          label: 'SYSTEM',
          labelColor: 'text-gray-300'
        };
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
            Call Transcript
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
              <span className="text-sm text-cyan-400/60 font-mono uppercase">
                {sessionState === 'active' || sessionState === 'processing' ? 'LIVE' : 
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

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm font-mono">
          <div className="p-2 bg-black/20 rounded-lg border border-cyan-500/20">
            <div className="text-gray-400 mb-1">Messages</div>
            <div className="text-white text-lg">{logs.length}</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg border border-cyan-500/20">
            <div className="text-gray-400 mb-1">User</div>
            <div className="text-cyan-400 text-lg">{logs.filter(l => l.type === 'user').length}</div>
          </div>
          <div className="p-2 bg-black/20 rounded-lg border border-cyan-500/20">
            <div className="text-gray-400 mb-1">AI</div>
            <div className="text-green-400 text-lg">{logs.filter(l => l.type === 'assistant').length}</div>
          </div>
        </div>
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {/* Holographic Scan Lines */}
        <div
          className="fixed inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.1) 2px,
              rgba(0, 255, 255, 0.1) 4px
            )`
          }}
        />

        {logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Activity className="w-16 h-16 text-cyan-400/40 mb-4" />
            </motion.div>
            <p className="text-cyan-300/60 font-mono text-sm">Waiting for call session to begin</p>
            <p className="text-gray-500 text-sm mt-2">Your conversation will appear here</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {logs.map((log, index) => {
              const style = getLogStyle(log.type);
              const IconComponent = style.icon;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: log.type === 'user' ? -20 : 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-4 rounded-2xl border backdrop-blur-sm ${style.bg} ${style.border}`}
                >
                  {/* Animated Border Glow */}
                  {log.type !== 'system' && (
                    <motion.div
                      className={`absolute inset-0 rounded-2xl border ${style.border} opacity-30`}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                    />
                  )}

                  <div className="relative flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-full border-2 ${style.border} ${style.bg} flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <motion.div
                            className={`w-2 h-2 rounded-full ${style.dotColor}`}
                            animate={{
                              opacity: log.type === 'system' ? 1 : [0.7, 1, 0.7],
                              scale: log.type === 'system' ? 1 : [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: log.type === 'system' ? 0 : Infinity,
                            }}
                          />
                          <span className={`font-bold text-sm uppercase tracking-wider font-mono ${style.labelColor}`}>
                            {style.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 font-mono">{log.timestamp}</span>
                      </div>

                      {/* Tools Used (for assistant messages) - TOP ROW, CENTERED */}
                      {log.type === 'assistant' && log.toolsUsed && log.toolsUsed.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-3 pb-2 border-b border-green-500/20"
                        >
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <span className="text-sm text-green-400/60 font-mono uppercase tracking-wider">Tools:</span>
                            {log.toolsUsed.map((tool, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-sm bg-green-500/10 border border-green-500/30 rounded text-green-300 font-mono"
                                title={tool.description || tool.name}
                              >
                                {tool.name}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <p className="text-white leading-relaxed font-mono text-sm break-words">
                        {log.message}
                      </p>

                      {/* Timing and Audio Indicators */}
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          {/* Audio Playback Indicator */}
                          {log.audioUrl && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="flex items-center space-x-2 text-sm text-green-400/80"
                            >
                              <Activity className="w-3 h-3" />
                              <span className="font-mono">Audio response played</span>
                            </motion.div>
                          )}
                        </div>

                        {/* Response Timing (bottom-right for assistant messages) */}
                        {log.type === 'assistant' && log.timing && (
                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center space-x-3 text-sm text-slate-400 font-mono"
                          >
                            <Clock className="w-3 h-3" />
                            <div className="flex items-center space-x-2">
                              {log.timing.llmMs !== undefined && (
                                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400">
                                  LLM: {(log.timing.llmMs / 1000).toFixed(2)}s
                                </span>
                              )}
                              {log.timing.ttsMs !== undefined && (
                                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-green-400">
                                  TTS: {(log.timing.ttsMs / 1000).toFixed(2)}s
                                </span>
                              )}
                              {log.timing.totalMs !== undefined && (
                                <span className="px-2 py-0.5 bg-slate-500/20 border border-slate-500/30 rounded text-slate-300">
                                  Total: {(log.timing.totalMs / 1000).toFixed(2)}s
                                </span>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Listening Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative p-4 rounded-2xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600/20 via-blue-600/10 to-cyan-800/20 backdrop-blur-sm"
            >
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-cyan-400/30"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />

              <div className="relative flex items-center space-x-3">
                <motion.div
                  className="w-3 h-3 rounded-full bg-cyan-400"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                />
                <span className="text-cyan-300 font-mono text-sm">Listening for your response...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
