'use client';

import {
  Search,
  UserCog,
  Bot,
  CheckCircle,
  RotateCcw,
  Github,
  MessageCircle,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import { getTimeAgo } from '../../lib/utils/timeUtils';
import { SLABadge } from '../sla';
import { SentimentBadge, PriorityBadge, ConfidenceBadge } from '../../lib/utils/sentimentUtils';

interface SplitViewContentProps {
  item: FeedbackItem;
  onAction: (action: string) => void;
}

export function SplitViewContent({ item, onAction }: SplitViewContentProps) {
  const getActionButtons = (): { id: string; label: string; icon: LucideIcon; primary: boolean }[] => {
    switch (item.status) {
      case 'new':
        return [{ id: 'analyze', label: 'Run Analysis', icon: Search, primary: true }];
      case 'analyzed':
        return [
          { id: 'assign-manual', label: 'Manual', icon: UserCog, primary: false },
          { id: 'assign-auto', label: 'AI Agent', icon: Bot, primary: true },
        ];
      case 'manual':
      case 'automatic':
        return [{ id: 'mark-done', label: 'Done', icon: CheckCircle, primary: true }];
      case 'done':
        return [{ id: 'reopen', label: 'Reopen', icon: RotateCcw, primary: false }];
      default:
        return [];
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-4">
        {/* Top indicators row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SLABadge item={item} />
            <PriorityBadge priority={item.priority} />
          </div>
          <span className="text-xs text-gray-500">
            {getTimeAgo(item.timestamp)}
          </span>
        </div>

        {/* Sentiment and Confidence badges */}
        {item.analysis && (
          <div className="flex items-center gap-2 flex-wrap">
            <SentimentBadge sentiment={item.analysis.sentiment} />
            <ConfidenceBadge confidence={item.analysis.confidence} />
          </div>
        )}

        {/* Content */}
        <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40">
          {item.content.subject && (
            <h3 className="font-medium text-gray-200 mb-2">
              {item.content.subject}
            </h3>
          )}
          <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
            {item.content.body}
          </p>

          {/* Engagement (for social channels) */}
          {item.engagement && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700/40">
              {item.engagement.replies !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageCircle className="w-3 h-3" /> {item.engagement.replies}
                </span>
              )}
              {item.engagement.retweets !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Share2 className="w-3 h-3" /> {item.engagement.retweets}
                </span>
              )}
              {item.engagement.likes !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {item.engagement.likes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status info */}
        <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/40">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Status</div>
          <div className="text-sm font-medium capitalize text-gray-200">
            {item.status}
          </div>
        </div>

        {/* AI Analysis */}
        {item.analysis && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs font-medium text-cyan-400">AI Analysis</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Classification</span>
                <span className="text-gray-200">{item.analysis.bugTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pipeline</span>
                <span className="text-gray-200 capitalize">
                  {item.analysis.suggestedPipeline}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] rounded-full bg-gray-800/60
                  text-gray-400 border border-gray-700/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="sticky bottom-0 p-3 border-t border-gray-700/50
        bg-gray-900 flex items-center justify-between gap-2">
        <button
          onClick={() => onAction('create-github')}
          className="p-2 text-gray-500 hover:text-gray-300
            hover:bg-gray-800/60 rounded transition-colors"
          title="Create GitHub Issue"
        >
          <Github className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          {getActionButtons().map(btn => {
            const BtnIcon = btn.icon;
            return (
              <button
                key={btn.id}
                onClick={() => onAction(btn.id)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium flex items-center gap-1.5
                  transition-colors ${
                    btn.primary
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-gray-800/60 text-gray-200 hover:bg-gray-700/60'
                  }`}
              >
                <BtnIcon className="w-3.5 h-3.5" />
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SplitViewContent;
