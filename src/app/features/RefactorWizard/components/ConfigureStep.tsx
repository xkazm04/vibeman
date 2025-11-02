'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function ConfigureStep() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-light text-white mb-2">Configure Refactoring</h3>
        <p className="text-gray-400 text-sm">
          Customize how refactoring will be applied (Step currently unused)
        </p>
      </div>

      <button
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 flex items-center justify-center space-x-2"
      >
        <span>Next</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
