'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Facebook,
  MessageCircle,
  Star,
  Smartphone,
  Instagram,
  MoreHorizontal,
  Frown,
  Meh,
  ThumbsUp,
  Lightbulb,
  Bot,
  User,
  Loader2,
  Github,
} from 'lucide-react';
import type { FeedbackItem, KanbanChannel } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult, AIProcessingStatus } from '../lib/types/aiTypes';
import { getTimeAgo } from '../lib/utils/timeUtils';
import CardMenu from './CardMenu';
import { SLABadge } from './sla';
import { TeamIcon, ResponseIndicator } from './TeamIcon';
import { XIcon } from './KanbanBoardConstants';

// Channel icon component map
const ChannelIcon: Record<KanbanChannel, React.FC<{ className?: string }>> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

interface KanbanCardProps {
  item: FeedbackItem;
  isDragging?: boolean;
  isSelected?: boolean;
  isProcessing?: boolean;
  processingStatus?: AIProcessingStatus;
  aiResult?: FeedbackAnalysisResult;
  onDragStart?: (e: React.DragEvent, item: FeedbackItem) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: (item: FeedbackItem) => void;
  onDoubleClick?: (item: FeedbackItem) => void;
  onRightClick?: (item: FeedbackItem, e: React.MouseEvent) => void;
  onAction?: (action: string, item: FeedbackItem) => void;
}

export default function KanbanCard({
  item,
  isDragging = false,
  isSelected = false,
  isProcessing = false,
  processingStatus,
  aiResult,
  onDragStart,
  onDragEnd,
  onClick,
  onDoubleClick,
  onRightClick,
  onAction,
}: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    onDragStart?.(e, item);
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRightClick?.(item, e);
    },
    [item, onRightClick]
  );

  const Icon = ChannelIcon[item.channel];

  // Channel-specific card styles - dark theme
  const getChannelCardStyle = () => {
    const baseStyle = 'rounded-xl shadow-sm hover:shadow-md backdrop-blur-sm';
    switch (item.channel) {
      case 'email':
        return `${baseStyle} bg-gray-900/70 shadow-blue-500/10 hover:shadow-blue-500/20`;
      case 'x':
        return `${baseStyle} bg-black/80 shadow-gray-500/10 hover:shadow-gray-500/20`;
      case 'facebook':
        return `${baseStyle} bg-gray-900/70 shadow-indigo-500/10 hover:shadow-indigo-500/20`;
      case 'support_chat':
        return `${baseStyle} bg-gray-900/70 shadow-green-500/10 hover:shadow-green-500/20`;
      case 'trustpilot':
        return `${baseStyle} bg-gray-900/70 shadow-emerald-500/10 hover:shadow-emerald-500/20`;
      case 'app_store':
        return `${baseStyle} bg-gray-900/70 shadow-purple-500/10 hover:shadow-purple-500/20`;
      case 'instagram':
        return `${baseStyle} bg-gray-900/70 shadow-pink-500/10 hover:shadow-pink-500/20`;
      default:
        return `${baseStyle} bg-gray-900/70 shadow-gray-500/10 hover:shadow-gray-500/20`;
    }
  };

  // Get background icon color based on channel
  const getBackgroundIconColor = () => {
    switch (item.channel) {
      case 'email': return 'text-blue-500';
      case 'x': return 'text-gray-400';
      case 'facebook': return 'text-[#1877f2]';
      case 'support_chat': return 'text-green-500';
      case 'trustpilot': return 'text-[#00b67a]';
      case 'app_store': return 'text-purple-500';
      case 'instagram': return 'text-pink-500';
      default: return 'text-gray-400';
    }
  };

  const getChannelHeaderStyle = () => {
    switch (item.channel) {
      case 'x': return 'text-white';
      case 'email': return 'text-blue-400';
      case 'facebook': return 'text-[#1877f2]';
      case 'support_chat': return 'text-green-400';
      case 'trustpilot': return 'text-[#00b67a]';
      case 'instagram': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'angry':
      case 'frustrated':
        return <Frown className="w-3 h-3 text-red-400" />;
      case 'disappointed':
        return <Meh className="w-3 h-3 text-orange-400" />;
      case 'constructive':
        return <Lightbulb className="w-3 h-3 text-green-400" />;
      case 'helpful':
        return <ThumbsUp className="w-3 h-3 text-green-400" />;
      default:
        return <Meh className="w-3 h-3 text-gray-400" />;
    }
  };

  const renderChannelSpecificContent = () => {
    switch (item.channel) {
      case 'email':
        return (
          <div className="space-y-2">
            {item.content.subject && (
              <div className="font-semibold text-sm text-gray-100 line-clamp-1">
                {item.content.subject}
              </div>
            )}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>From:</span>
              <span className="font-medium text-gray-300">{item.author.name}</span>
            </div>
          </div>
        );
      case 'x':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                {item.author.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{item.author.name}</div>
                <div className="text-xs text-gray-500">{item.author.handle}</div>
              </div>
            </div>
            <div className="text-sm text-white/90 line-clamp-2">{item.content.body.substring(0, 100)}</div>
          </div>
        );
      case 'support_chat':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live Chat</span>
            </div>
            <div className="bg-gray-800/80 rounded-lg rounded-bl-none p-2 text-sm text-gray-200 border border-green-900/40">
              {item.content.body.substring(0, 60)}...
            </div>
          </div>
        );
      case 'trustpilot':
      case 'app_store':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < (item.rating || 3) ? 'fill-[#00b67a] text-[#00b67a]' : 'text-gray-600'}`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-300 line-clamp-2">
              {item.content.body.substring(0, 80)}
            </div>
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-300 line-clamp-2">
            {item.content.body.substring(0, 100)}
          </div>
        );
    }
  };

  // Priority border only for items that have been analyzed
  const priorityBorderClass =
    item.status !== 'new' && item.priority === 'critical'
      ? 'ring-1 ring-red-500'
      : item.status !== 'new' && item.priority === 'high'
      ? 'ring-1 ring-yellow-500'
      : '';

  // Selection state styling
  const getSelectionClass = () => {
    if (isSelected) return 'border-2 border-cyan-500';
    return 'border-2 border-transparent';
  };

  const getProcessingClass = () => {
    if (processingStatus === 'processing') return 'opacity-70';
    if (processingStatus === 'success' || aiResult) return 'ring-1 ring-green-500/50';
    if (processingStatus === 'error') return 'ring-1 ring-red-500/50';
    return '';
  };

  // Classification badge colors
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'bug':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'feature':
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'clarification':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{
        layout: { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 },
        default: { type: 'spring', stiffness: 350, damping: 28 },
        opacity: { duration: 0.15 },
      }}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={() => onClick?.(item)}
        onDoubleClick={() => onDoubleClick?.(item)}
        onContextMenu={handleContextMenu}
        className={`
          relative group cursor-grab active:cursor-grabbing
          transition-all duration-200 overflow-hidden
          ${getChannelCardStyle()}
          ${priorityBorderClass}
          ${isDragging ? 'opacity-50 scale-105' : ''}
          ${getSelectionClass()}
          ${getProcessingClass()}
        `}
      >
        {/* Background channel icon */}
        <div className={`absolute bottom-2 right-2 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300 pointer-events-none ${getBackgroundIconColor()}`}>
          <Icon className="w-24 h-24" />
        </div>

        {/* Processing overlay */}
        <AnimatePresence>
          {processingStatus === 'processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-md"
            >
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-xs text-white font-medium">Analyzing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-700/40">
            <div className={`flex items-center gap-1.5 text-xs ${getChannelHeaderStyle()}`}>
              <span title={item.channel.replace('_', ' ')}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-gray-500">{getTimeAgo(item.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {item.githubIssueUrl && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-500/10 rounded" title="GitHub Issue linked">
                  <Github className="w-3 h-3" />
                </span>
              )}
              {item.status !== 'new' && <SLABadge item={item} compact />}
            </div>
          </div>

          {/* Content */}
          {item.status === 'new' ? (
            <div className="overflow-hidden">{renderChannelSpecificContent()}</div>
          ) : (
            <div className="overflow-hidden">
              {(aiResult?.title || item.analysis) && (
                <div className="text-sm font-semibold mb-2 text-gray-100">
                  {aiResult?.title || item.analysis?.bugTag || 'Analysis Complete'}
                </div>
              )}
              {aiResult?.reasoning && (
                <div className="text-xs mb-2 line-clamp-2 text-gray-400">
                  {aiResult.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-700/40">
            <div className="flex gap-2 flex-wrap items-center">
              {item.status !== 'new' && (aiResult || item.analysis) && (
                <>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${getClassificationColor((aiResult?.classification || item.analysis?.bugTag) as string)}`}>
                    {aiResult?.classification || item.analysis?.bugTag}
                  </span>
                  {(aiResult?.sentiment || item.analysis?.sentiment) && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      {getSentimentIcon(aiResult?.sentiment || item.analysis?.sentiment as string)}
                      <span className="capitalize">{aiResult?.sentiment || item.analysis?.sentiment}</span>
                    </div>
                  )}
                  {(aiResult?.assignedTeam || item.analysis?.assignedTeam) && (
                    <TeamIcon team={aiResult?.assignedTeam || item.analysis?.assignedTeam} size="xs" showBadge />
                  )}
                  {(aiResult?.customerResponse || item.customerResponse) && (
                    <ResponseIndicator
                      hasResponse={true}
                      followUpRequired={aiResult?.customerResponse?.followUpRequired || item.customerResponse?.followUpRequired || false}
                      size="xs"
                    />
                  )}
                </>
              )}
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 rounded-sm transition-colors text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                aria-label="Card actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <CardMenu
                  item={item}
                  onClose={() => setMenuOpen(false)}
                  onAction={(action) => {
                    onAction?.(action, item);
                    setMenuOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Resolved indicator */}
        {item.status === 'done' && item.resolvedBy && (
          <div className="absolute top-2 right-8 text-[10px] px-1.5 py-0.5 rounded-sm bg-green-500/20 text-green-400 flex items-center gap-1">
            {item.resolvedBy === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
            <span>Resolved</span>
          </div>
        )}

        {/* Right-click hint */}
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-gray-600">
          Right-click to select
        </div>
      </div>
    </motion.div>
  );
}
