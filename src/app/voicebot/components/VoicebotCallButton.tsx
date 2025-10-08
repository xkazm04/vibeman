'use client';

import { motion } from 'framer-motion';
import { Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';

type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

interface VoicebotCallButtonProps {
  sessionState: SessionState;
  isListening: boolean;
  audioLevel: number;
  onStartSession: () => void;
  onEndSession: () => void;
}

export default function VoicebotCallButton({
  sessionState,
  isListening,
  audioLevel,
  onStartSession,
  onEndSession
}: VoicebotCallButtonProps) {
  
  const getStateConfig = () => {
    switch (sessionState) {
      case 'connecting':
        return {
          icon: Loader2,
          color: 'from-yellow-500 to-orange-500',
          borderColor: 'border-yellow-500/50',
          bgColor: 'bg-yellow-600/10',
          text: 'Connecting...',
          description: 'Establishing connection to voice server'
        };
      case 'active':
        return {
          icon: PhoneOff,
          color: 'from-green-500 to-emerald-500',
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-600/10',
          text: isListening ? 'Listening...' : 'Processing...',
          description: 'Call in progress - Speak naturally'
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'from-blue-500 to-cyan-500',
          borderColor: 'border-blue-500/50',
          bgColor: 'bg-blue-600/10',
          text: 'Processing...',
          description: 'Analyzing your message'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'from-red-500 to-rose-500',
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-600/10',
          text: 'Error',
          description: 'Connection failed - Click to retry'
        };
      default:
        return {
          icon: Phone,
          color: 'from-cyan-500 to-blue-500',
          borderColor: 'border-cyan-500/50',
          bgColor: 'bg-cyan-600/10',
          text: 'Start Call',
          description: 'Click to begin voice session'
        };
    }
  };

  const config = getStateConfig();
  const IconComponent = config.icon;
  const isActive = sessionState === 'active' || sessionState === 'processing';

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10 p-8">
      {/* Call Button */}
      <div className="flex flex-col items-center mb-8">
        <motion.div
          className="relative mb-6"
          animate={{
            scale: isListening ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
          }}
        >
          <motion.button
            onClick={isActive ? onEndSession : (sessionState === 'error' ? onStartSession : onStartSession)}
            disabled={sessionState === 'connecting'}
            className={`
              relative w-32 h-32 rounded-full border-4 
              ${config.borderColor} ${config.bgColor}
              transition-all duration-300 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              overflow-hidden
            `}
            whileHover={sessionState !== 'connecting' ? { scale: 1.05 } : {}}
            whileTap={sessionState !== 'connecting' ? { scale: 0.95 } : {}}
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-20`} />
            
            {/* Pulse Ring for Active State */}
            {isActive && (
              <motion.div
                className={`absolute inset-0 rounded-full border-4 ${config.borderColor}`}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            )}

            {/* Audio Level Ring */}
            {isListening && audioLevel > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-green-400/60"
                animate={{
                  scale: 1 + audioLevel * 0.5,
                  opacity: audioLevel,
                }}
                transition={{ duration: 0.1 }}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <motion.div
                animate={sessionState === 'connecting' || sessionState === 'processing' ? {
                  rotate: 360,
                } : {}}
                transition={{
                  duration: 2,
                  repeat: (sessionState === 'connecting' || sessionState === 'processing') ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <IconComponent className={`w-16 h-16 bg-gradient-to-br ${config.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
              </motion.div>
            </div>
          </motion.button>

          {/* Ripple Effect on Click */}
          {isActive && (
            <>
              <motion.div
                className={`absolute inset-0 rounded-full border-2 ${config.borderColor}`}
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />
              <motion.div
                className={`absolute inset-0 rounded-full border-2 ${config.borderColor}`}
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 1,
                }}
              />
            </>
          )}
        </motion.div>

        {/* State Text */}
        <motion.h3
          key={config.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-bold mb-2 bg-gradient-to-r ${config.color} bg-clip-text text-transparent font-mono`}
        >
          {config.text}
        </motion.h3>

        <motion.p
          key={config.description}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-400 text-center max-w-xs font-mono"
        >
          {config.description}
        </motion.p>
      </div>

      {/* Audio Level Visualizer */}
      {isListening && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-center space-x-1 h-20">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-2 bg-gradient-to-t from-green-500 to-cyan-400 rounded-full"
                animate={{
                  height: `${Math.max(8, (Math.random() * audioLevel * 60) + 10)}%`,
                  opacity: audioLevel > 0.01 ? [0.5, 1, 0.5] : 0.3,
                }}
                transition={{
                  duration: 0.15,
                  ease: "easeOut",
                  opacity: { duration: 0.5, repeat: Infinity }
                }}
              />
            ))}
          </div>
          <p className="text-center text-xs text-cyan-400/60 mt-2 font-mono">
            {audioLevel > 0.02 ? 'VOICE DETECTED' : 'LISTENING...'}
          </p>
        </motion.div>
      )}

      {/* Session Info */}
      <div className="space-y-3 mt-auto pt-6 border-t border-cyan-500/20">
        <div className="flex items-center justify-between text-sm font-mono">
          <span className="text-gray-400">Status</span>
          <motion.div
            className="flex items-center space-x-2"
            animate={{
              opacity: isActive ? [0.7, 1, 0.7] : 1,
            }}
            transition={{
              duration: 2,
              repeat: isActive ? Infinity : 0,
            }}
          >
            <div className={`w-2 h-2 rounded-full ${
              sessionState === 'idle' ? 'bg-gray-400' :
              sessionState === 'connecting' ? 'bg-yellow-400' :
              sessionState === 'active' || sessionState === 'processing' ? 'bg-green-400' :
              'bg-red-400'
            }`} />
            <span className="text-white uppercase">{sessionState}</span>
          </motion.div>
        </div>

        <div className="flex items-center justify-between text-sm font-mono">
          <span className="text-gray-400">Auto-send</span>
          <span className="text-white">3s silence</span>
        </div>

        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between text-sm font-mono"
          >
            <span className="text-gray-400">Audio Level</span>
            <div className="flex-1 mx-3 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-cyan-400"
                animate={{
                  width: `${audioLevel * 100}%`,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-white">{Math.round(audioLevel * 100)}%</span>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      {sessionState === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl"
        >
          <h4 className="text-sm font-bold text-cyan-400 mb-2 font-mono">HOW IT WORKS</h4>
          <ul className="text-xs text-gray-300 space-y-1 font-mono">
            <li>• Click to start voice call session</li>
            <li>• Speak naturally into your microphone</li>
            <li>• Pause for 3 seconds to auto-send</li>
            <li>• AI responds with voice and text</li>
            <li>• Continue conversation seamlessly</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
