'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, User, Calendar } from 'lucide-react';
import { CustomBacklogItem } from '../../../types';

interface CustomBacklogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: CustomBacklogItem) => void;
}

export default function BacklogFormAdd({ isOpen, onClose, onSubmit }: CustomBacklogFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      onSubmit({
        id: Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        description: description.trim(),
        timestamp: new Date(),
        type: 'custom'
      });
      setTitle('');
      setDescription('');
      onClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    onClose();
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
            <div className="relative w-full max-w-lg bg-gray-950/90 border border-gray-700/30 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
                      <Plus className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Add Custom Item</h2>
                      <p className="text-sm text-gray-400">Create a new backlog item</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a concise title for your backlog item..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide detailed description of the task or improvement..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                  />
                </div>

                {/* Preview Section */}
                {(title.trim() || description.trim()) && (
                  <div className="border-t border-gray-700/30 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Preview</h3>
                    <div className="p-4 bg-gray-800/30 rounded-lg space-y-2">
                      {title.trim() && (
                        <h4 className="text-white font-medium text-sm">{title}</h4>
                      )}
                      {description.trim() && (
                        <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>Custom</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date().toLocaleString()}</span>
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
                    className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!title.trim() || !description.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Add to Backlog
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 