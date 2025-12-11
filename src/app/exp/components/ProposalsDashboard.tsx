'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ProposalPanel } from '@/app/features/Proposals';

/**
 * Proposals Dashboard Wrapper
 * Displays the proposal management system
 */
export default function ProposalsDashboard() {
  const [isPanelVisible] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <FileText className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-white">Proposals</h2>
            <p className="text-sm text-gray-400">
              Review and manage code proposals
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Accepted</span>
          </div>
          <div className="text-2xl font-light text-white">-</div>
          <p className="text-xs text-gray-500 mt-1">
            Proposals approved and implemented
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Pending</span>
          </div>
          <div className="text-2xl font-light text-white">-</div>
          <p className="text-xs text-gray-500 mt-1">
            Awaiting review and decision
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gray-900/60 backdrop-blur-xl border border-gray-800/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Declined</span>
          </div>
          <div className="text-2xl font-light text-white">-</div>
          <p className="text-xs text-gray-500 mt-1">
            Proposals that were rejected
          </p>
        </motion.div>
      </div>

      {/* Main Content - Proposal Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 overflow-hidden min-h-[400px]"
      >
        <div className="p-6">
          {/* Proposal Panel Component */}
          <div className="relative">
            <ProposalPanel isVisible={isPanelVisible} />

            {/* Empty State Message */}
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                No Active Proposals
              </h3>
              <p className="text-sm text-gray-500">
                Proposals will appear here when they are ready for review
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
      >
        <p className="text-sm text-green-300">
          <span className="font-medium">How it works:</span> The Proposal system
          presents code changes in a Tinder-style interface, allowing you to
          quickly review, accept, or decline proposals with optional code generation.
        </p>
      </motion.div>
    </div>
  );
}
