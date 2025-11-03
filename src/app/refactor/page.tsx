'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import RefactorWizardLayout from '../features/RefactorWizard/RefactorWizardLayout';
import { Sparkles, Zap, TrendingUp, Shield } from 'lucide-react';

export default function RefactorPage() {
  const { openWizard } = useRefactorStore();

  return (
    <div className="min-h-screen pt-24 px-6 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-light text-white tracking-wide">
              AI-Powered Refactor Wizard
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Analyze your entire codebase, discover improvement opportunities, and execute batch refactoring with AI assistance
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {/* Feature 1 */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Intelligent Analysis</h3>
            </div>
            <p className="text-gray-400">
              AI scans your entire project to identify code quality issues, performance bottlenecks, security vulnerabilities, and architectural improvements.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Batch Refactoring</h3>
            </div>
            <p className="text-gray-400">
              Generate and execute refactoring scripts that apply changes across multiple files simultaneously, saving hours of manual work.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Safe Execution</h3>
            </div>
            <p className="text-gray-400">
              Review all proposed changes before execution. Each refactoring action is validated and can be selectively applied.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-medium text-white">Context-Aware</h3>
            </div>
            <p className="text-gray-400">
              AI understands your project's architecture and coding patterns, providing refactoring suggestions that fit your codebase style.
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={openWizard}
            className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-lg font-medium rounded-xl transition-all duration-300 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
            data-testid="open-refactor-wizard"
          >
            <span className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6" />
              <span>Launch Refactor Wizard</span>
            </span>
          </button>

          <p className="text-gray-500 text-sm mt-4">
            Requires an active project to be selected
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-light text-white text-center mb-8">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, title: 'Scan', description: 'Analyze your codebase' },
              { step: 2, title: 'Review', description: 'Select opportunities' },
              { step: 3, title: 'Configure', description: 'Customize settings' },
              { step: 4, title: 'Execute', description: 'Apply refactoring' },
              { step: 5, title: 'Results', description: 'View changes' },
            ].map((item, index) => (
              <div
                key={item.step}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-cyan-400 text-xl font-medium">{item.step}</span>
                </div>
                <h4 className="text-white font-medium mb-1">{item.title}</h4>
                <p className="text-gray-400 text-xs">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Wizard Modal */}
      <RefactorWizardLayout />
    </div>
  );
}
