'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, CheckCircle, Loader2, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

interface TicketCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: {
    title: string;
    description: string;
    priority: string;
  } | null;
  onConfirm: () => void;
}

type CreationPhase = 'preview' | 'creating' | 'success';

export default function TicketCreationModal({
  isOpen,
  onClose,
  ticketData,
  onConfirm,
}: TicketCreationModalProps) {
  const [phase, setPhase] = useState<CreationPhase>('preview');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPhase('preview');
      setGeneratedKey('');
    }
  }, [isOpen]);

  const handleCreate = async () => {
    setPhase('creating');

    // Simulate API call with animation phases
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate random ticket key
    const key = `VIB-${Math.floor(Math.random() * 900) + 100}`;
    setGeneratedKey(key);
    setPhase('success');

    // Auto-close after success
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 2000);
  };

  if (!ticketData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase === 'preview' ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Ticket className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Create Jira Ticket</h2>
                </div>
                {phase === 'preview' && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {phase === 'preview' && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Title */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Title</label>
                        <div className="mt-1 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                          <p className="text-sm text-gray-200">{ticketData.title}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Description</label>
                        <div className="mt-1 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30 max-h-48 overflow-y-auto custom-scrollbar">
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticketData.description}</p>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">Priority:</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium uppercase ${
                          ticketData.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                          ticketData.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                          ticketData.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {ticketData.priority}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'creating' && (
                    <motion.div
                      key="creating"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center py-8"
                    >
                      {/* Animated loader */}
                      <div className="relative w-24 h-24 mb-6">
                        {/* Outer ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-purple-500/30"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                        {/* Inner ring */}
                        <motion.div
                          className="absolute inset-2 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent"
                          animate={{ rotate: -360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        />
                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Ticket className="w-8 h-8 text-purple-400" />
                          </motion.div>
                        </div>
                      </div>

                      <motion.p
                        className="text-gray-300 font-medium"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Creating ticket in Jira...
                      </motion.p>

                      {/* Progress dots */}
                      <div className="flex gap-1 mt-4">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-purple-400"
                            animate={{
                              opacity: [0.3, 1, 0.3],
                              scale: [0.8, 1.2, 0.8],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center py-8"
                    >
                      {/* Success animation */}
                      <motion.div
                        className="relative w-24 h-24 mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full bg-emerald-500/20"
                          initial={{ scale: 1 }}
                          animate={{ scale: [1, 1.5, 1.5], opacity: [1, 0, 0] }}
                          transition={{ duration: 0.6 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/50">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                          >
                            <CheckCircle className="w-12 h-12 text-emerald-400" />
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.p
                        className="text-emerald-300 font-medium text-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        Ticket Created!
                      </motion.p>

                      <motion.div
                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/30"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Ticket className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 font-mono font-medium">{generatedKey}</span>
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </motion.div>

                      {/* Sparkle effects */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            left: `${30 + Math.random() * 40}%`,
                            top: `${20 + Math.random() * 40}%`,
                          }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 0.8,
                            delay: 0.3 + i * 0.1,
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-amber-400" />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {phase === 'preview' && (
                <div className="flex justify-end gap-3 p-4 border-t border-gray-700/50 bg-gray-800/30">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Ticket className="w-4 h-4" />
                    Create Ticket
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
