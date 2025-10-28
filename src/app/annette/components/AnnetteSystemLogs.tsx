'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, MicOff, Play, X, Volume2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'user' | 'system' | 'tool' | 'llm';
  message: string;
  data?: any;
  audioUrl?: string;
  audioError?: string;
  audioLoading?: boolean;
}

interface ConfirmationState {
  isWaiting: boolean;
  question: string;
  type: 'yes_no' | 'clarification';
  toolsToUse: any[];
  originalMessage: string;
  projectContext: any;
}

type VoicebotState = 'idle' | 'listening' | 'processing' | 'error' | 'awaiting_confirmation';

interface AnnetteSystemLogsProps {
  logs: LogEntry[];
  confirmation: ConfirmationState;
  state: VoicebotState;
  onVoiceInput: () => void;
  onConfirmation: (confirmed: boolean) => void;
  onClearLogs: () => void;
  onPlayAudio: (audioUrl: string) => void;
}

const AnnetteSystemLogs = ({
  logs,
  confirmation,
  state,
  onVoiceInput,
  onConfirmation,
  onClearLogs,
  onPlayAudio
}: AnnetteSystemLogsProps) => {
  const [displayMode, setDisplayMode] = useState<'full' | 'online'>('full');
  const [onlineQueue, setOnlineQueue] = useState<(LogEntry & { fadeId: string; displayTimestamp: number })[]>([]);

  // Handle online mode queue management
  useEffect(() => {
    if (displayMode === 'online' && logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      const queueItem = {
        ...latestLog,
        fadeId: `${latestLog.id}-${Date.now()}`,
        displayTimestamp: Date.now()
      };

      setOnlineQueue(prev => [...prev, queueItem]);

      // Auto-remove after 5 seconds
      const timer = setTimeout(() => {
        setOnlineQueue(prev => prev.filter(item => item.fadeId !== queueItem.fadeId));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [logs, displayMode]);

  // Clear online queue when switching modes
  useEffect(() => {
    if (displayMode === 'full') {
      setOnlineQueue([]);
    }
  }, [displayMode]);
  const getStateConfig = () => {
    switch (state) {
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-400 border-blue-600/50 bg-blue-600/10',
          description: 'Processing...'
        };
      case 'awaiting_confirmation':
        return {
          icon: MessageSquare,
          color: 'text-yellow-400 border-yellow-600/50 bg-yellow-600/10',
          description: 'Awaiting Confirmation'
        };
      case 'error':
        return {
          icon: MicOff,
          color: 'text-red-400 border-red-600/50 bg-red-600/10',
          description: 'Error - Click to retry'
        };
      default:
        return {
          icon: MessageSquare,
          color: 'text-green-400 border-green-600/50 bg-green-600/10',
          description: 'Test Voice Pipeline'
        };
    }
  };

  const stateConfig = getStateConfig();
  const IconComponent = stateConfig.icon;

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10 flex flex-col">
      {/* Neural Control Panel Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent mb-4 font-mono uppercase tracking-wider">Neural Pipeline Testing</h2>

        {/* Confirmation Panel */}
        <AnimatePresence>
          {confirmation.isWaiting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg"
            >
              <h3 className="text-lg font-medium text-yellow-300 mb-2">Confirmation Required</h3>
              <p className="text-white mb-4">{confirmation.question}</p>

              {confirmation.type === 'yes_no' ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onConfirmation(true)}
                    className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Yes, Continue
                  </button>
                  <button
                    onClick={() => onConfirmation(false)}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    No, Cancel
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-300">
                  Please provide clarification in your next message.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Button */}
        <div className="flex flex-col items-center mb-6">
          <motion.button
            onClick={onVoiceInput}
            disabled={state === 'processing' || state === 'awaiting_confirmation'}
            className={`
              relative w-20 h-20 rounded-full border-2 
              ${stateConfig.color}
              transition-all duration-300 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            whileHover={state === 'idle' ? { scale: 1.05 } : {}}
            whileTap={state === 'idle' ? { scale: 0.95 } : {}}
            animate={state === 'processing' ? {
              rotate: 360,
              transition: { duration: 2, repeat: Infinity, ease: "linear" }
            } : state === 'awaiting_confirmation' ? {
              scale: [1, 1.05, 1],
              transition: { duration: 2, repeat: Infinity }
            } : {}}
          >
            <div className="flex items-center justify-center w-full h-full">
              <IconComponent size={28} />
            </div>
          </motion.button>

          <p className="mt-3 text-sm text-gray-400 text-center">
            {stateConfig.description}
          </p>
        </div>

        <button
          onClick={onClearLogs}
          className="w-full py-2 px-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {/* Neural Logs Display - Full Height */}
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">Neural Activity Logs</h3>
          <div className="flex items-center space-x-4">
            {/* Display Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
              <motion.button
                onClick={() => setDisplayMode('full')}
                className={`px-3 py-1 rounded text-sm font-mono uppercase tracking-wider transition-all ${displayMode === 'full'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-300'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Full
              </motion.button>
              <motion.button
                onClick={() => setDisplayMode('online')}
                className={`px-3 py-1 rounded text-sm font-mono uppercase tracking-wider transition-all ${displayMode === 'online'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'text-gray-400 hover:text-green-300'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Online
              </motion.button>
            </div>

            <div className="flex items-center space-x-2">
              <motion.div
                className={`w-2 h-2 rounded-full ${displayMode === 'online' ? 'bg-green-400' : 'bg-cyan-400'
                  }`}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm text-cyan-400/60 font-mono">
                {displayMode === 'online' ? 'ONLINE' : 'ARCHIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Neural Scrollbar */}
        <div className="flex-1 relative">
          <div
            className="h-full overflow-y-auto pr-4 space-y-3 neural-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 255, 255, 0.3) rgba(17, 24, 39, 0.5)',
            }}
          >

            {displayMode === 'full' ? (
              // Full Mode - Show all logs
              logs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                  <p className="text-cyan-300/60 font-mono text-sm">Neural pipeline ready for activation</p>
                  <p className="text-gray-500 text-sm mt-2">Click the neural interface to begin testing</p>
                </motion.div>
              ) : (
                logs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-4 rounded-2xl border backdrop-blur-sm ${log.type === 'user' ? 'bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-blue-800/20 border-cyan-400/30' :
                        log.type === 'system' ? 'bg-gradient-to-r from-gray-600/20 via-slate-600/10 to-gray-800/20 border-gray-400/30' :
                          log.type === 'tool' ? 'bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-blue-800/20 border-blue-400/30' :
                            'bg-gradient-to-r from-green-600/20 via-emerald-600/10 to-green-800/20 border-green-400/30'
                      }`}
                  >
                    {/* Holographic Border Effect */}
                    <div className="relative flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${log.type === 'user' ? 'bg-cyan-400' :
                            log.type === 'system' ? 'bg-gray-400' :
                              log.type === 'tool' ? 'bg-blue-400' :
                                'bg-green-400'
                          }`} />
                        <span className={`font-bold text-sm uppercase tracking-wider font-mono ${log.type === 'user' ? 'text-cyan-300' :
                            log.type === 'system' ? 'text-gray-300' :
                              log.type === 'tool' ? 'text-blue-300' :
                                'text-green-300'
                          }`}>
                          {log.type === 'llm' ? 'ANNETTE-AI' : log.type.toUpperCase()}
                        </span>

                        {/* Audio controls for LLM responses */}
                        {log.type === 'llm' && (log.audioUrl || log.audioError || log.audioLoading) && (
                          <div className="flex items-center space-x-1">
                            {log.audioLoading ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="p-1"
                                title="Generating neural audio..."
                              >
                                <Volume2 className="w-4 h-4 text-cyan-400" />
                              </motion.div>
                            ) : log.audioUrl ? (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onPlayAudio(log.audioUrl!)}
                                className="p-1 hover:bg-green-500/20 rounded-full transition-colors"
                                title="Play neural audio"
                              >
                                <Play className="w-4 h-4 text-green-400" />
                              </motion.button>
                            ) : log.audioError ? (
                              <div
                                className="p-1 cursor-help"
                                title={`Neural Audio Error: ${log.audioError}`}
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 font-mono">{log.timestamp}</span>
                    </div>

                    <p className="text-white leading-relaxed font-mono text-base">{log.message}</p>

                    {log.data && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 p-3 bg-black/30 rounded-lg border border-cyan-500/20"
                      >
                        <pre className="text-sm text-cyan-300/80 overflow-x-auto font-mono">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </motion.div>
                ))
              )
            ) : (
              // Online Mode - Show only recent logs with fade-out effect
              <div className="relative h-full">
                {onlineQueue.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-green-400"
                        animate={{
                          opacity: [0.5, 1, 0.5],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-green-300/80 font-mono text-sm uppercase tracking-wider">Online Mode Active</p>
                    </div>
                    <p className="text-gray-500 text-sm">New neural activity will appear here temporarily</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {onlineQueue.map((queueItem) => (
                      <motion.div
                        key={queueItem.fadeId}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={`absolute top-0 left-0 right-0 p-4 rounded-2xl border backdrop-blur-sm mb-3 ${queueItem.type === 'user' ? 'bg-gradient-to-r from-blue-600/30 via-cyan-600/20 to-blue-800/30 border-cyan-400/50' :
                            queueItem.type === 'system' ? 'bg-gradient-to-r from-gray-600/30 via-slate-600/20 to-gray-800/30 border-gray-400/50' :
                              queueItem.type === 'tool' ? 'bg-gradient-to-r from-blue-600/30 via-violet-600/20 to-blue-800/30 border-blue-400/50' :
                                'bg-gradient-to-r from-green-600/30 via-emerald-600/20 to-green-800/30 border-green-400/50'
                          }`}
                        style={{
                          transform: `translateY(${onlineQueue.indexOf(queueItem) * 80}px)`,
                          zIndex: onlineQueue.length - onlineQueue.indexOf(queueItem)
                        }}
                      >
                        {/* Pulsing border for online mode */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl border-2 border-green-400/30"
                          animate={{
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.02, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />

                        <div className="relative flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <motion.div
                              className={`w-3 h-3 rounded-full ${queueItem.type === 'user' ? 'bg-cyan-400' :
                                  queueItem.type === 'system' ? 'bg-gray-400' :
                                    queueItem.type === 'tool' ? 'bg-blue-400' :
                                      'bg-green-400'
                                }`}
                              animate={{
                                opacity: [0.7, 1, 0.7],
                                scale: [1, 1.3, 1],
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className={`font-bold text-sm uppercase tracking-wider font-mono ${queueItem.type === 'user' ? 'text-cyan-300' :
                                queueItem.type === 'system' ? 'text-gray-300' :
                                  queueItem.type === 'tool' ? 'text-blue-300' :
                                    'text-green-300'
                              }`}>
                              {queueItem.type === 'llm' ? 'ANNETTE-AI' : queueItem.type.toUpperCase()}
                            </span>

                            {/* Audio controls for LLM responses */}
                            {queueItem.type === 'llm' && (queueItem.audioUrl || queueItem.audioError || queueItem.audioLoading) && (
                              <div className="flex items-center space-x-1">
                                {queueItem.audioLoading ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="p-1"
                                    title="Generating neural audio..."
                                  >
                                    <Volume2 className="w-4 h-4 text-cyan-400" />
                                  </motion.div>
                                ) : queueItem.audioUrl ? (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onPlayAudio(queueItem.audioUrl!)}
                                    className="p-1 hover:bg-green-500/20 rounded-full transition-colors"
                                    title="Play neural audio"
                                  >
                                    <Play className="w-4 h-4 text-green-400" />
                                  </motion.button>
                                ) : queueItem.audioError ? (
                                  <div
                                    className="p-1 cursor-help"
                                    title={`Neural Audio Error: ${queueItem.audioError}`}
                                  >
                                    <X className="w-4 h-4 text-red-400" />
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Online mode indicator */}
                            <motion.span
                              className="text-sm text-green-400/80 font-mono uppercase tracking-wider bg-green-400/10 px-2 py-1 rounded-full border border-green-400/30"
                              animate={{
                                opacity: [0.6, 1, 0.6],
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              LIVE
                            </motion.span>
                          </div>
                          <span className="text-sm text-gray-500 font-mono">{queueItem.timestamp}</span>
                        </div>

                        <p className="text-white leading-relaxed font-mono text-base">{queueItem.message}</p>

                        {queueItem.data && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 p-3 bg-black/40 rounded-lg border border-green-500/30"
                          >
                            <pre className="text-sm text-green-300/80 overflow-x-auto font-mono">
                              {JSON.stringify(queueItem.data, null, 2)}
                            </pre>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          {/* Neural Scroll Indicator */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400/20 to-slate-500/20 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default AnnetteSystemLogs;