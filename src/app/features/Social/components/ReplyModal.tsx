'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, Loader2, Facebook, Twitter, Mail, Sparkles, MessageCircle, Edit3 } from 'lucide-react';
import type { FeedbackChannel } from '../lib/types';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyData: {
    originalMessage: string;
    author: string;
    channel: Exclude<FeedbackChannel, 'all'>;
    suggestedReply: string;
  } | null;
  onConfirm: (reply: string) => void;
}

type SendPhase = 'compose' | 'sending' | 'success';

const channelConfig = {
  facebook: {
    icon: Facebook,
    name: 'Facebook',
    color: 'blue',
  },
  twitter: {
    icon: Twitter,
    name: 'Twitter',
    color: 'sky',
  },
  email: {
    icon: Mail,
    name: 'Email',
    color: 'amber',
  },
};

export default function ReplyModal({
  isOpen,
  onClose,
  replyData,
  onConfirm,
}: ReplyModalProps) {
  const [phase, setPhase] = useState<SendPhase>('compose');
  const [reply, setReply] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen && replyData) {
      setPhase('compose');
      setReply(replyData.suggestedReply);
      setIsEditing(false);
    }
  }, [isOpen, replyData]);

  const handleSend = async () => {
    setPhase('sending');

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 2000));

    setPhase('success');

    // Auto-close after success
    setTimeout(() => {
      onConfirm(reply);
      onClose();
    }, 1500);
  };

  if (!replyData) return null;

  const channel = channelConfig[replyData.channel];
  const ChannelIcon = channel.icon;

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
            onClick={phase === 'compose' ? onClose : undefined}
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
                  <div className={`p-2 rounded-lg bg-${channel.color}-500/20`}>
                    <ChannelIcon className={`w-5 h-5 text-${channel.color}-400`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Send Reply</h2>
                    <p className="text-xs text-gray-500">via {channel.name}</p>
                  </div>
                </div>
                {phase === 'compose' && (
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
                  {phase === 'compose' && (
                    <motion.div
                      key="compose"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Original message */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">
                          Replying to {replyData.author}
                        </label>
                        <div className="mt-1 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                          <p className="text-sm text-gray-400 line-clamp-3">{replyData.originalMessage}</p>
                        </div>
                      </div>

                      {/* Reply */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            AI Suggested Reply
                          </label>
                          <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            {isEditing ? 'View' : 'Edit'}
                          </button>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            className="w-full h-32 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30 text-sm text-gray-200 resize-none focus:border-blue-500/50 focus:outline-none transition-colors"
                          />
                        ) : (
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-sm text-gray-200">{reply}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'sending' && (
                    <motion.div
                      key="sending"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center py-8"
                    >
                      {/* Animated sender */}
                      <div className="relative w-24 h-24 mb-6">
                        {/* Sending waves */}
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className={`absolute inset-0 rounded-full border-2 border-${channel.color}-500/50`}
                            initial={{ scale: 1, opacity: 1 }}
                            animate={{
                              scale: [1, 2, 2],
                              opacity: [0.5, 0, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.4,
                            }}
                          />
                        ))}

                        {/* Center icon */}
                        <motion.div
                          className={`absolute inset-0 flex items-center justify-center rounded-full bg-${channel.color}-500/20`}
                          animate={{ scale: [1, 0.95, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <Send className={`w-8 h-8 text-${channel.color}-400`} />
                        </motion.div>
                      </div>

                      <motion.p
                        className="text-gray-300 font-medium"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Sending reply to {channel.name}...
                      </motion.p>

                      {/* Flying message animation */}
                      <motion.div
                        className="mt-4"
                        animate={{
                          x: [0, 100],
                          opacity: [1, 0],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'easeIn',
                        }}
                      >
                        <MessageCircle className="w-6 h-6 text-gray-500" />
                      </motion.div>
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
                        {/* Burst effect */}
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
                        Reply Sent!
                      </motion.p>

                      <motion.p
                        className="mt-2 text-sm text-gray-500"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Your message has been delivered to {replyData.author}
                      </motion.p>

                      {/* Confetti-like sparkles */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${10 + Math.random() * 60}%`,
                          }}
                          initial={{ opacity: 0, scale: 0, rotate: 0 }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            rotate: [0, 180],
                            y: [0, -20],
                          }}
                          transition={{
                            duration: 1,
                            delay: 0.2 + i * 0.05,
                          }}
                        >
                          <Sparkles className={`w-4 h-4 ${
                            i % 3 === 0 ? 'text-emerald-400' :
                            i % 3 === 1 ? 'text-blue-400' : 'text-purple-400'
                          }`} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {phase === 'compose' && (
                <div className="flex justify-end gap-3 p-4 border-t border-gray-700/50 bg-gray-800/30">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send className="w-4 h-4" />
                    Send Reply
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
