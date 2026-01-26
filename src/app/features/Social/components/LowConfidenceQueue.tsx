'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Eye,
  Tag,
  Users,
  Clock,
  ArrowRight,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import type { FeedbackItem, KanbanPriority } from '../lib/types/feedbackTypes';
import type { FeedbackClassification, DevTeam } from '../lib/types/aiTypes';
import type { ClassificationResult } from '../lib/feedbackClassifier';
import ClassificationBadge from './ClassificationBadge';

interface LowConfidenceItem {
  item: FeedbackItem;
  classification: ClassificationResult;
  addedAt: string;
}

interface LowConfidenceQueueProps {
  items: LowConfidenceItem[];
  onApprove: (itemId: string, classification: ClassificationResult) => void;
  onCorrect: (
    itemId: string,
    newClassification: FeedbackClassification | 'question' | 'praise' | 'complaint',
    newTeam?: DevTeam,
    newPriority?: KanbanPriority
  ) => void;
  onSkip: (itemId: string) => void;
  onViewItem: (item: FeedbackItem) => void;
  onReprocess?: (itemId: string) => void;
}

export default function LowConfidenceQueue({
  items,
  onApprove,
  onCorrect,
  onSkip,
  onViewItem,
  onReprocess,
}: LowConfidenceQueueProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [correctionMode, setCorrectionMode] = useState<string | null>(null);
  const [selectedCorrection, setSelectedCorrection] = useState<{
    classification?: FeedbackClassification | 'question' | 'praise' | 'complaint';
    team?: DevTeam;
    priority?: KanbanPriority;
  }>({});

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
    setCorrectionMode(null);
    setSelectedCorrection({});
  };

  const handleApprove = (lowConfItem: LowConfidenceItem) => {
    onApprove(lowConfItem.item.id, lowConfItem.classification);
  };

  const handleStartCorrection = (id: string) => {
    setCorrectionMode(id);
    setSelectedCorrection({});
  };

  const handleSubmitCorrection = (itemId: string) => {
    if (selectedCorrection.classification) {
      onCorrect(
        itemId,
        selectedCorrection.classification,
        selectedCorrection.team,
        selectedCorrection.priority
      );
      setCorrectionMode(null);
      setSelectedCorrection({});
    }
  };

  // Sort by confidence (lowest first) then by time
  const sortedItems = [...items].sort((a, b) => {
    const confDiff = a.classification.confidence - b.classification.confidence;
    if (Math.abs(confDiff) > 0.1) return confDiff;
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });

  // Stats
  const avgConfidence = items.length > 0
    ? items.reduce((sum, i) => sum + i.classification.confidence, 0) / items.length
    : 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-200">
                Review Queue
              </h3>
              <p className="text-xs text-gray-500">
                {items.length} items need manual review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs">
              <Gauge className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">Avg Confidence:</span>
              <span className={`font-medium ${
                avgConfidence >= 0.5 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {Math.round(avgConfidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue items */}
      <div className="divide-y divide-gray-800/50">
        <AnimatePresence>
          {sortedItems.map((lowConfItem) => {
            const { item, classification } = lowConfItem;
            const isExpanded = expandedItem === item.id;
            const isCorrecting = correctionMode === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                {/* Main row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors ${
                    isExpanded ? 'bg-gray-800/20' : ''
                  }`}
                  onClick={() => toggleExpand(item.id)}
                >
                  {/* Confidence indicator */}
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        classification.confidence >= 0.5
                          ? 'bg-yellow-500/10'
                          : 'bg-red-500/10'
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          classification.confidence >= 0.5
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {Math.round(classification.confidence * 100)}%
                      </span>
                    </div>
                    {/* Circular progress */}
                    <svg
                      className="absolute inset-0 -rotate-90"
                      viewBox="0 0 40 40"
                    >
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-800"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${classification.confidence * 113} 113`}
                        className={
                          classification.confidence >= 0.5
                            ? 'text-yellow-500'
                            : 'text-red-500'
                        }
                      />
                    </svg>
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ClassificationBadge
                        classification={classification.classification}
                        size="xs"
                        showConfidence={false}
                      />
                      <span className="text-sm text-gray-200 truncate">
                        {item.content.subject || item.content.body.slice(0, 50)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{item.author.name}</span>
                      <span>{item.channel}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(lowConfItem.addedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleApprove(lowConfItem)}
                      className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Approve classification"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartCorrection(item.id)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Correct classification"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSkip(item.id)}
                      className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Skip for now"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expand indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    className="text-gray-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-800/50 overflow-hidden"
                    >
                      <div className="px-4 py-4 space-y-4">
                        {/* Full message */}
                        <div className="bg-gray-800/30 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">
                            Original Message
                          </div>
                          <p className="text-sm text-gray-300">
                            {item.content.body}
                          </p>
                        </div>

                        {/* Classification details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-2">
                              AI Classification
                            </div>
                            <ClassificationBadge
                              classification={classification.classification}
                              confidence={classification.confidence}
                              signals={classification.signals}
                              suggestedTeam={classification.suggestedTeam}
                              tags={classification.tags}
                              variant="card"
                            />
                          </div>

                          <div>
                            <div className="text-xs text-gray-400 mb-2">
                              Detected Signals
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {classification.signals.map((signal, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded"
                                >
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Correction form */}
                        {isCorrecting && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border-t border-gray-800 pt-4"
                          >
                            <div className="text-xs text-gray-400 mb-3">
                              Correct Classification
                            </div>

                            <div className="space-y-3">
                              {/* Classification selector */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-1.5">
                                  Correct type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {(['bug', 'feature', 'question', 'praise', 'complaint', 'clarification'] as const).map(
                                    (c) => (
                                      <button
                                        key={c}
                                        onClick={() =>
                                          setSelectedCorrection((prev) => ({
                                            ...prev,
                                            classification: c,
                                          }))
                                        }
                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                          selectedCorrection.classification === c
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                      >
                                        {c}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Team selector */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-1.5">
                                  Assign to team (optional)
                                </label>
                                <select
                                  value={selectedCorrection.team || ''}
                                  onChange={(e) =>
                                    setSelectedCorrection((prev) => ({
                                      ...prev,
                                      team: e.target.value as DevTeam || undefined,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:border-blue-500 focus:outline-none"
                                >
                                  <option value="">Auto-assign</option>
                                  <option value="frontend">Frontend</option>
                                  <option value="backend">Backend</option>
                                  <option value="mobile">Mobile</option>
                                  <option value="platform">Platform</option>
                                  <option value="customer-success">Customer Success</option>
                                  <option value="growth">Growth</option>
                                </select>
                              </div>

                              {/* Priority selector */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-1.5">
                                  Priority (optional)
                                </label>
                                <div className="flex gap-2">
                                  {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                                    <button
                                      key={p}
                                      onClick={() =>
                                        setSelectedCorrection((prev) => ({
                                          ...prev,
                                          priority: p,
                                        }))
                                      }
                                      className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${
                                        selectedCorrection.priority === p
                                          ? p === 'critical'
                                            ? 'border-red-500 bg-red-500/10 text-red-400'
                                            : p === 'high'
                                            ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                            : p === 'medium'
                                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                            : 'border-green-500 bg-green-500/10 text-green-400'
                                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Submit */}
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  onClick={() => {
                                    setCorrectionMode(null);
                                    setSelectedCorrection({});
                                  }}
                                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSubmitCorrection(item.id)}
                                  disabled={!selectedCorrection.classification}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  Apply Correction
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Actions */}
                        {!isCorrecting && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                            <button
                              onClick={() => onViewItem(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View Full Details
                            </button>
                            {onReprocess && (
                              <button
                                onClick={() => onReprocess(item.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Reprocess with AI
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="px-4 py-8 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-50" />
            <p className="text-sm text-gray-400">All caught up!</p>
            <p className="text-xs text-gray-500 mt-1">
              No items need manual review right now
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function getTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
