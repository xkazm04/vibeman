import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';

interface ContextSectionEmptyProps {
  onCreateGroup?: () => void;
  className?: string;
}

const ContextSectionEmpty = React.memo(({ onCreateGroup, className = '' }: ContextSectionEmptyProps) => {
  return (
    <motion.div
      className={`${className} relative overflow-hidden`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
    >
      {/* Neural Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />

      {/* Animated Grid Pattern */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '15px 15px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '15px 15px'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <button
        onClick={onCreateGroup}
        className="relative flex flex-col items-center justify-center w-full h-full p-8 hover:bg-white/[0.02] transition-all duration-300 group rounded-2xl border border-gray-700/30 hover:border-cyan-500/30"
      >
        <motion.div
          className="relative mb-4"
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 via-slate-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:via-slate-500/30 group-hover:to-blue-500/30 rounded-2xl flex items-center justify-center transition-all duration-300 backdrop-blur-sm border border-cyan-500/30">
            <Plus className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300" />
          </div>
          <motion.div 
            className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <div className="text-center space-y-2">
          <p className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300 transition-all font-mono">
            Create Neural Cluster
          </p>
          <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors max-w-48">
            Initialize new context orchestration node
          </p>
        </div>

        {/* Floating Particles */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
      </button>
    </motion.div>
  );
});

ContextSectionEmpty.displayName = 'ContextSectionEmpty';

export default ContextSectionEmpty;