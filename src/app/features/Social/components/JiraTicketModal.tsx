'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, User, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { JiraTicket } from '../lib/types';

interface JiraTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: JiraTicket | null;
}

const priorityConfig = {
  low: { color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Low' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Medium' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'High' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Critical' },
};

const statusConfig = {
  created: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Created' },
  in_progress: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'In Progress' },
  resolved: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Resolved' },
  closed: { icon: CheckCircle, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Closed' },
};

export default function JiraTicketModal({ isOpen, onClose, ticket }: JiraTicketModalProps) {
  if (!ticket) return null;

  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900 border border-gray-700/50 shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Ticket className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Jira Ticket</h2>
                    <p className="text-sm text-gray-400">{ticket.key}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
                {/* Ticket Key and Title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-sm">
                      {ticket.key}
                    </span>
                    <span className={`px-3 py-1 rounded-lg ${status.bg} ${status.color} text-sm font-medium flex items-center gap-1.5`}>
                      <StatusIcon className="w-4 h-4" />
                      {status.label}
                    </span>
                    <span className={`px-3 py-1 rounded-lg ${priority.bg} ${priority.color} text-sm font-medium`}>
                      {priority.label} Priority
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{ticket.title}</h3>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/40">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Reporter</span>
                    </div>
                    <p className="text-white font-medium">AI System</p>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/40">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Created</span>
                    </div>
                    <p className="text-white font-medium">
                      {ticket.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                  <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700/40">
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>
                </div>

                {/* Acceptance Criteria (mock) */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Acceptance Criteria</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
                      <div className="w-5 h-5 mt-0.5 rounded border-2 border-gray-600" />
                      <span className="text-gray-300">Issue is reproducible and documented</span>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
                      <div className="w-5 h-5 mt-0.5 rounded border-2 border-gray-600" />
                      <span className="text-gray-300">Root cause identified and fix implemented</span>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
                      <div className="w-5 h-5 mt-0.5 rounded border-2 border-gray-600" />
                      <span className="text-gray-300">Tests added to prevent regression</span>
                    </div>
                  </div>
                </div>

                {/* Labels (mock) */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Labels</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-sm">
                      user-reported
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-sm">
                      ai-generated
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm">
                      social-feedback
                    </span>
                  </div>
                </div>

                {/* Link to Jira (mock) */}
                {ticket.url && (
                  <div className="pt-4 border-t border-gray-700/50">
                    <a
                      href={ticket.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>View in Jira</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-700/50 bg-gray-900/95 backdrop-blur-sm">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
