'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Facebook,
  MessageCircle,
  Star,
  Smartphone,
  Instagram,
  Share2,
  Search,
  UserCog,
  Bot,
  CheckCircle,
  RotateCcw,
  Github,
  type LucideIcon,
} from 'lucide-react';
import type { FeedbackItem, KanbanChannel } from '../lib/types/feedbackTypes';
import { getTimeAgo } from '../lib/utils/timeUtils';
import { SLABadge } from './sla';
import { TeamIcon, ResponseIndicator, TEAM_LABELS } from './TeamIcon';
import { SentimentBadge, ConfidenceBadge } from '../lib/utils/sentimentUtils';
import { XIcon } from './KanbanBoardConstants';

// Channel icon component map
const ChannelIcon: Record<KanbanChannel, LucideIcon> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

interface CardDetailModalProps {
  isOpen: boolean;
  item: FeedbackItem | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

export default function CardDetailModal({
  isOpen,
  item,
  onClose,
  onAction,
}: CardDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !item) return null;

  const getActionButtons = () => {
    switch (item.status) {
      case 'new':
        return [{ id: 'analyze', label: 'Run Analysis', icon: Search, primary: true }];
      case 'analyzed':
        return [
          { id: 'assign-manual', label: 'Move to Manual', icon: UserCog, primary: false },
          { id: 'assign-auto', label: 'Send to AI Agent', icon: Bot, primary: true },
        ];
      case 'manual':
      case 'automatic':
        return [{ id: 'mark-done', label: 'Mark as Done', icon: CheckCircle, primary: true }];
      case 'done':
        return [{ id: 'reopen', label: 'Reopen', icon: RotateCcw, primary: false }];
      default:
        return [];
    }
  };

  const renderChannelSpecificContent = () => {
    switch (item.channel) {
      case 'email':
        return (
          <div className="bg-gray-800/60 rounded-lg border border-gray-700/40 shadow-sm overflow-hidden">
            <div className="bg-gray-900/50 p-4 border-b border-gray-700/40">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-100 truncate">
                    {item.content.subject || '(No Subject)'}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                    <span className="font-medium text-gray-300">{item.author.name}</span>
                    <span>&lt;{item.author.email}&gt;</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="p-6 text-gray-200 whitespace-pre-wrap leading-relaxed text-base">
              {item.content.body}
            </div>
          </div>
        );

      case 'x':
        return (
          <div className="bg-black rounded-xl border border-gray-800 p-4 max-w-xl mx-auto shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                  {item.author.name.charAt(0)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 truncate">
                    <span className="font-bold text-white truncate">{item.author.name}</span>
                    <span className="text-gray-500 truncate">{item.author.handle}</span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-gray-500">{getTimeAgo(item.timestamp)}</span>
                  </div>
                </div>
                <div className="mt-1 text-white text-[15px] leading-normal whitespace-pre-wrap">
                  {item.content.body}
                </div>
                <div className="mt-3 flex items-center justify-between text-gray-500 max-w-md">
                  <div className="flex items-center gap-2 group cursor-pointer hover:text-gray-300">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">{item.engagement?.replies || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 group cursor-pointer hover:text-green-500">
                    <Share2 className="w-4 h-4" />
                    <span className="text-xs">{item.engagement?.retweets || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 group cursor-pointer hover:text-pink-500">
                    <span className="text-xs">{item.engagement?.likes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'support_chat':
        return (
          <div className="bg-gray-900 rounded-lg border border-gray-700/40 shadow-sm flex flex-col h-[400px]">
            <div className="p-3 border-b border-gray-700/40 bg-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                {item.author.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-sm text-gray-100">{item.author.name}</div>
                <div className="text-xs text-gray-500">{item.author.device || 'Online'}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
              {item.conversation?.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'customer'
                      ? 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-none'
                      : 'bg-cyan-500 text-white rounded-tr-none'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              )) || (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-none">
                    {item.content.body}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/40">
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {item.content.body}
            </div>
          </div>
        );
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gray-900 border border-gray-700/60 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto" role="dialog" aria-modal="true">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700/40 bg-gray-900">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-gray-800">
                    {(() => {
                      const IconComp = ChannelIcon[item.channel];
                      return <IconComp className="w-5 h-5 text-gray-400" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-200 capitalize">
                      {item.channel.replace('_', ' ')} Feedback
                    </h2>
                    {item.status !== 'new' && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="capitalize">{item.status}</span>
                        {item.analysis?.bugTag && <span>{item.analysis.bugTag}</span>}
                        {item.analysis?.assignedTeam && (
                          <span className="flex items-center gap-1">
                            <TeamIcon team={item.analysis.assignedTeam} size="xs" showLabel />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-500 hover:text-gray-200 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-900">
                {renderChannelSpecificContent()}

                {/* Key Indicators */}
                <div className="flex items-center gap-3 flex-wrap">
                  {item.status !== 'new' && <SLABadge item={item} />}
                  {item.status !== 'new' && item.analysis && (
                    <>
                      <SentimentBadge sentiment={item.analysis.sentiment} size="md" />
                      <ConfidenceBadge confidence={item.analysis.confidence} size="md" />
                    </>
                  )}
                  {item.status === 'new' && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-400 rounded-full border border-gray-700/40">
                      Awaiting Analysis
                    </span>
                  )}
                </div>

                {/* AI Analysis Results */}
                {item.status !== 'new' && item.analysis && (
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <h3 className="text-sm font-semibold text-cyan-400">AI Analysis</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-[80px]">Classification:</span>
                        <span className="text-gray-200">{item.analysis.bugTag}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-[80px]">Suggestion:</span>
                        <span className="text-gray-200 capitalize">{item.analysis.suggestedPipeline} pipeline</span>
                      </div>
                      {item.analysis.assignedTeam && (
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-500 min-w-[80px]">Team:</span>
                          <TeamIcon team={item.analysis.assignedTeam} size="sm" showBadge showLabel />
                        </div>
                      )}
                      {item.analysis.reasoning && (
                        <div className="mt-3 pt-3 border-t border-cyan-500/20">
                          <div className="text-gray-500 text-xs mb-1.5 font-medium">AI Reasoning:</div>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {item.analysis.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Response Section */}
                {item.status !== 'new' && item.customerResponse && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ResponseIndicator hasResponse={true} followUpRequired={item.customerResponse.followUpRequired} size="sm" />
                        <h3 className="text-sm font-semibold text-emerald-400">AI-Generated Response</h3>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        item.customerResponse.tone === 'apologetic' ? 'bg-red-500/20 text-red-400' :
                        item.customerResponse.tone === 'grateful' ? 'bg-green-500/20 text-green-400' :
                        item.customerResponse.tone === 'empathetic' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {item.customerResponse.tone}
                      </span>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700/40">
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {item.customerResponse.message}
                      </p>
                    </div>
                    {item.customerResponse.followUpRequired && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Follow-up recommended
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {item.status === 'new' ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      #awaiting-analysis
                    </span>
                  </div>
                ) : item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700/40"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with actions */}
              <div className="p-4 border-t border-gray-700/40 bg-gray-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {item.githubIssueUrl && (
                    <a
                      href={item.githubIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-300 px-2.5 py-1.5 bg-gray-500/10 rounded-md hover:bg-gray-500/20 transition-colors border border-gray-500/20"
                      title="Open GitHub Issue"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span className="font-medium">GitHub Issue</span>
                    </a>
                  )}
                  {!item.githubIssueUrl && (item.status === 'automatic' || item.analysis?.suggestedPipeline === 'automatic') && (
                    <button
                      onClick={() => onAction('create-github')}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 border border-gray-700/40"
                    >
                      <Github className="w-3.5 h-3.5" /> Create GitHub Issue
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getActionButtons().map((btn) => {
                    const BtnIcon = btn.icon;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => onAction(btn.id)}
                        className={`
                          px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium
                          ${
                            btn.primary
                              ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'
                              : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700/40'
                          }
                        `}
                      >
                        <BtnIcon className="w-4 h-4" /> {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
