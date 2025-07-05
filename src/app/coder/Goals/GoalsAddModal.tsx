'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Target, AlertCircle } from 'lucide-react';
import { Goal } from '../../../types';

interface GoalsAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: Omit<Goal, 'id' | 'order'>) => void;
}

export default function GoalsAddModal({ isOpen, onClose, onSubmit }: GoalsAddModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('open');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status
      });
      setTitle('');
      setDescription('');
      setStatus('open');
      onClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStatus('open');
    onClose();
  };

  const getStatusInfo = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return {
          text: 'Completed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30'
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30'
        };
      case 'open':
        return {
          text: 'Open',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30'
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/40 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-600/30">
                      <Plus className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white tracking-wide">Add New Goal</h2>
                      <p className="text-xs text-slate-400 font-medium">Create a new project goal</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Title Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a clear and concise goal title..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all"
                    autoFocus
                  />
                  {!title.trim() && (
                    <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                      <AlertCircle className="w-3 h-3" />
                      <span>Title is required</span>
                    </div>
                  )}
                </div>

                {/* Description Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
                    Description <span className="text-slate-500">(Optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a detailed description of the goal, including specific objectives and success criteria..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all resize-none"
                  />
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
                    Initial Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['open', 'in_progress', 'done'] as const).map((statusOption) => {
                      const statusInfo = getStatusInfo(statusOption);
                      return (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => setStatus(statusOption)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            status === statusOption
                              ? 'bg-slate-800/60 border-slate-600/50 text-slate-300'
                              : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                          }`}
                        >
                          {statusInfo.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview Section */}
                {title.trim() && (
                  <div className="border-t border-slate-700/30 pt-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3 tracking-wide">Preview</h3>
                    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium">{title}</h4>
                        <div className="px-2 py-1 rounded text-xs font-medium bg-slate-800/60 border border-slate-600/50 text-slate-300">
                          {getStatusInfo(status).text}
                        </div>
                      </div>
                      {description.trim() && (
                        <p className="text-slate-200 text-sm leading-relaxed">
                          {description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>New Goal</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!title.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/60 hover:to-slate-700/60 border border-slate-600/30 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Add Goal
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 