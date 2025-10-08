'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Activity } from 'lucide-react';

interface AnnetteChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isListening: boolean;
  onToggleListening: () => void;
  selectedProject?: any;
  isProcessing?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

const AnnetteChatInput = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isListening,
  onToggleListening,
  selectedProject,
  isProcessing,
  inputRef
}: AnnetteChatInputProps) => {
  return (
    <motion.div 
      className="relative p-6 border-t border-cyan-500/30 bg-gradient-to-r from-gray-900/90 via-slate-900/20 to-gray-900/90"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Input Field with Holographic Effect */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          {/* Holographic Input Container */}
          <motion.div
            className="relative"
            animate={{
              boxShadow: inputValue.length > 0 
                ? ["0 0 20px rgba(0, 255, 255, 0.3)", "0 0 30px rgba(0, 255, 255, 0.5)", "0 0 20px rgba(0, 255, 255, 0.3)"]
                : "0 0 10px rgba(99, 102, 241, 0.2)"
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={selectedProject ? "Neural interface ready... Enter your query" : "Project selection required for neural link"}
              disabled={!selectedProject || isProcessing}
              className="w-full px-6 py-4 bg-gray-900/80 border-2 border-cyan-400/30 rounded-2xl text-cyan-100 placeholder-cyan-400/50 focus:outline-none focus:border-cyan-400/60 transition-all disabled:opacity-50 font-mono backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(17, 24, 39, 0.8) 0%, 
                  rgba(55, 65, 81, 0.4) 50%, 
                  rgba(17, 24, 39, 0.8) 100%)`
              }}
            />
            
            {/* Static Holographic Border */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
              style={{
                background: `linear-gradient(45deg, rgba(0, 255, 255, 0.2), transparent, rgba(99, 102, 241, 0.2))`,
                padding: '2px',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
              }}
            />
            
            {/* Character Counter with Neural Style */}
            <AnimatePresence>
              {inputValue.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2"
                >
                  <div className="flex space-x-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-1 bg-cyan-400 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-cyan-400/60 font-mono">
                    {inputValue.length}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        
        {/* Neural Voice Interface */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleListening}
          disabled={!selectedProject}
          className={`
            relative p-4 rounded-2xl transition-all duration-300 disabled:opacity-50
            ${isListening 
              ? 'bg-gradient-to-br from-red-500/30 to-red-600/30 border-2 border-red-400/50' 
              : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-2 border-gray-600/30 hover:border-cyan-400/50'
            }
          `}
          title={isListening ? "Neural voice link active" : "Activate neural voice interface"}
        >
          {/* Pulse Ring for Voice */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-red-400/50"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
          )}
          
          <motion.div
            animate={isListening ? {
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 0.5,
              repeat: isListening ? Infinity : 0,
            }}
          >
            {isListening ? (
              <MicOff className="w-6 h-6 text-red-400" />
            ) : (
              <Mic className="w-6 h-6 text-cyan-400" />
            )}
          </motion.div>
        </motion.button>
        
        {/* Neural Transmission Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSendMessage}
          disabled={!inputValue.trim() || !selectedProject || isProcessing}
          className="relative p-4 bg-gradient-to-br from-slate-500/80 to-blue-600/80 hover:from-slate-400/80 hover:to-blue-500/80 rounded-2xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-slate-400/30"
          title="Transmit neural data"
        >
          {/* Transmission Effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={!isProcessing ? {
              background: [
                "conic-gradient(from 0deg, rgba(99, 102, 241, 0.3), transparent, rgba(99, 102, 241, 0.3))",
                "conic-gradient(from 180deg, rgba(99, 102, 241, 0.3), transparent, rgba(99, 102, 241, 0.3))",
                "conic-gradient(from 360deg, rgba(99, 102, 241, 0.3), transparent, rgba(99, 102, 241, 0.3))"
              ]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.div
            className="relative z-10"
            animate={isProcessing ? {
              rotate: 360,
            } : {}}
            transition={{
              duration: 1,
              repeat: isProcessing ? Infinity : 0,
              ease: "linear"
            }}
          >
            {isProcessing ? (
              <Activity className="w-6 h-6" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </motion.div>
        </motion.button>
      </div>
      
      {/* Neural Status Bar */}
      <motion.div
        className="mt-4 flex items-center justify-between text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center space-x-4">
          <span className="text-cyan-400/60">
            STATUS: {isProcessing ? 'PROCESSING' : isListening ? 'LISTENING' : 'READY'}
          </span>
          <span className="text-slate-400/60">
            PROJECT: {selectedProject?.name || 'NONE'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">NEURAL LINK</span>
          <motion.div
            className={`w-2 h-2 rounded-full ${
              selectedProject ? 'bg-green-400' : 'bg-red-400'
            }`}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnnetteChatInput;