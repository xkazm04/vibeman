'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Calendar, CheckCircle, Clock, Circle } from 'lucide-react';
import { Goal } from '../../../types';

interface GoalsDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (goal: Goal) => void;
}

export default function GoalsDetailModal({ 
  goal, 
  isOpen, 
  onClose, 
  onEdit 
}: GoalsDetailModalProps) {
  if (!goal) return null;

  const getStatusInfo = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return {
          text: 'Completed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: CheckCircle
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          icon: Clock
        };
      case 'open':
        return {
          text: 'Open',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          icon: Circle
        };
    }
  };

  const statusInfo = getStatusInfo(goal.status);
  const StatusIcon = statusInfo.icon;

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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700/40 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-700/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-600/30">
                      <Target className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white tracking-wide">
                        {goal.title}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
                          <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                          <span className={statusInfo.color}>{statusInfo.text}</span>
                        </div>
                        <span className="text-xs text-slate-500">Order #{goal.order}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Description */}
                  {goal.description && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Description</h3>
                      <p className="text-slate-200 leading-relaxed">
                        {goal.description}
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Status</h4>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className={`text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Order</h4>
                        <p className="text-sm text-slate-400">#{goal.order}</p>
                      </div>
                      {goal.created_at && (
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                          <h4 className="text-sm font-medium text-slate-300 mb-1">Created</h4>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-400">
                              {new Date(goal.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {goal.updated_at && goal.updated_at !== goal.created_at && (
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                          <h4 className="text-sm font-medium text-slate-300 mb-1">Last Updated</h4>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-400">
                              {new Date(goal.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-700/30 bg-slate-800/20">
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
                  >
                    Close
                  </motion.button>
                  {onEdit && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onEdit(goal)}
                      className="px-6 py-2 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/60 hover:to-slate-700/60 border border-slate-600/30 rounded-lg text-white font-medium transition-all duration-200"
                    >
                      Edit Goal
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 