import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Lightbulb, Rocket, Target } from 'lucide-react';

interface DocsGeneratorProps {
  projectName: string;
  onGenerate: (vision?: string) => void;
  isGenerating: boolean;
}

export default function DocsGenerator({ projectName, onGenerate, isGenerating }: DocsGeneratorProps) {
  const [vision, setVision] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] px-8">
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="relative mb-8"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30">
          <FileText className="w-16 h-16 text-blue-400" />
        </div>

        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: [0, Math.cos(i * 60 * Math.PI / 180) * 50],
              y: [0, Math.sin(i * 60 * Math.PI / 180) * 50],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
            style={{
              top: '50%',
              left: '50%',
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
        ))}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3 text-center"
      >
        High-Level Vision Documentation
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 text-lg mb-8 text-center max-w-2xl"
      >
        Generate strategic documentation for <span className="text-blue-400 font-semibold">{projectName}</span> that focuses on vision, architecture philosophy, and business value.
      </motion.p>

      {/* Feature Pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-3 justify-center mb-10 max-w-3xl"
      >
        {[
          { icon: Target, text: 'Strategic Vision', color: 'from-blue-500 to-cyan-500' },
          { icon: Lightbulb, text: 'Architecture Philosophy', color: 'from-purple-500 to-pink-500' },
          { icon: Rocket, text: 'Business Value', color: 'from-green-500 to-emerald-500' },
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 backdrop-blur-sm"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
              <feature.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-300 text-sm font-medium">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Vision Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-2xl mb-6"
      >
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Your Vision <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          disabled={isGenerating}
          placeholder="What's your vision for this project? What problem does it solve? What makes it unique?&#10;&#10;Examples:&#10;- 'Build a platform that helps developers manage multiple projects efficiently'&#10;- 'Create an AI-powered tool for code analysis and documentation'&#10;- 'Revolutionary approach to team collaboration with real-time insights'"
          className="w-full h-32 bg-slate-900/50 text-slate-300 text-sm rounded-lg border border-slate-700/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-slate-500 mt-2">
          This helps the AI understand your project's purpose and generate more personalized documentation
        </p>
      </motion.div>

      {/* Generate Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={!isGenerating ? { scale: 1.05, y: -2 } : {}}
        whileTap={!isGenerating ? { scale: 0.95 } : {}}
        onClick={() => onGenerate(vision.trim() || undefined)}
        disabled={isGenerating}
        className={`relative px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
          isGenerating
            ? 'bg-gradient-to-r from-blue-500/50 to-purple-600/50 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
        }`}
      >
        {isGenerating ? (
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
            <span>Generating Documentation...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5" />
            <span>Generate High-Level Docs</span>
          </div>
        )}
      </motion.button>

      {/* Info Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-slate-500 text-sm mt-6 text-center max-w-2xl"
      >
        This will analyze your codebase and create comprehensive strategic documentation
        automatically saved to <code className="text-blue-400 bg-slate-800 px-2 py-1 rounded">context/high.md</code>
      </motion.p>

      {/* Loading State Animation */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-8 space-y-3 w-full max-w-md"
        >
          {[
            'Analyzing codebase structure...',
            'Identifying architectural patterns...',
            'Evaluating strategic goals...',
            'Generating insights...'
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 1.5, duration: 0.5 }}
              className="flex items-center space-x-3 text-slate-400 text-sm"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 1.5 }}
                className="w-2 h-2 bg-blue-400 rounded-full"
              />
              <span>{step}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
