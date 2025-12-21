'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Facebook, MessageCircle, Star, Smartphone, Instagram,
  Bug, Lightbulb, HelpCircle, Github, Loader2,
} from 'lucide-react';
import type { FeedbackItem, KanbanChannel } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult } from '../lib/types/aiTypes';
import { XIcon } from './KanbanBoardConstants';
import { CardMenuCompact } from './CardMenu';

const ChannelIcon: Record<KanbanChannel, React.FC<{ className?: string }>> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

const ChannelColors: Record<KanbanChannel, string> = {
  email: 'text-blue-400',
  x: 'text-gray-300',
  facebook: 'text-indigo-400',
  support_chat: 'text-green-400',
  trustpilot: 'text-emerald-400',
  app_store: 'text-purple-400',
  instagram: 'text-pink-400',
};

interface KanbanCardCompactProps {
  item: FeedbackItem;
  isSelected?: boolean;
  isProcessing?: boolean;
  aiResult?: FeedbackAnalysisResult;
  onDragStart?: (e: React.DragEvent, item: FeedbackItem) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: (item: FeedbackItem) => void;
  onRightClick?: (item: FeedbackItem, e: React.MouseEvent) => void;
  onAction?: (action: string, item: FeedbackItem) => void;
}

export default function KanbanCardCompact({
  item,
  isSelected = false,
  isProcessing = false,
  aiResult,
  onDragStart,
  onDragEnd,
  onClick,
  onRightClick,
  onAction,
}: KanbanCardCompactProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    onDragStart?.(e, item);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRightClick?.(item, e);
  }, [item, onRightClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(item);
    }
  }, [onClick, item]);

  const Icon = ChannelIcon[item.channel];
  const classification = aiResult?.classification || item.analysis?.bugTag?.toLowerCase();
  const hasGithub = !!item.analysis?.bugId?.includes('-');

  const getStatusClasses = () => {
    const base = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900';
    if (isSelected) return `${base} border-cyan-500/60 bg-cyan-900/20 ring-1 ring-cyan-500/30`;
    if (isProcessing) return `${base} border-yellow-500/50 bg-yellow-900/10 ring-1 ring-yellow-500/30`;
    switch (item.status) {
      case 'analyzed': return `${base} border-blue-500/40 bg-blue-900/10 hover:bg-blue-800/20`;
      case 'manual': return `${base} border-yellow-500/40 bg-yellow-900/10 hover:bg-yellow-800/20`;
      case 'automatic': return `${base} border-cyan-500/40 bg-cyan-900/10 hover:bg-cyan-800/20`;
      case 'done': return `${base} border-green-500/40 bg-green-900/10 hover:bg-green-800/20`;
      default: return `${base} border-gray-600/40 bg-gray-800/20 hover:bg-gray-700/30`;
    }
  };

  const ClassificationIcon = classification === 'bug' ? Bug
    : classification === 'feature' ? Lightbulb
    : classification === 'clarification' ? HelpCircle
    : null;

  return (
    <motion.div
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${item.content.body.substring(0, 50)} - ${item.status}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer
        transition-all duration-150 ${getStatusClasses()}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ x: 2, transition: { duration: 0.1 } }}
      whileTap={{ scale: 0.98 }}
      onDragStart={handleDragStart as unknown as (event: MouseEvent | TouchEvent | PointerEvent) => void}
      onDragEnd={onDragEnd as unknown as (event: MouseEvent | TouchEvent | PointerEvent) => void}
      onClick={() => onClick?.(item)}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      data-testid={`kanban-card-${item.id}`}
    >
      {/* Left badges */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Processing indicator */}
        {isProcessing && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />}

        {/* Channel icon */}
        {Icon && <Icon className={`w-3.5 h-3.5 ${ChannelColors[item.channel]}`} />}

        {/* Classification icon */}
        {ClassificationIcon && (
          <ClassificationIcon className={`w-3 h-3 ${
            classification === 'bug' ? 'text-red-400' :
            classification === 'feature' ? 'text-green-400' :
            'text-blue-400'
          }`} />
        )}
      </div>

      {/* Content preview */}
      <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
        {aiResult?.title || item.content.body.substring(0, 60)}
      </span>

      {/* Right badges */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Priority indicator */}
        <span className={`w-1.5 h-1.5 rounded-full ${
          item.priority === 'critical' ? 'bg-red-500' :
          item.priority === 'high' ? 'bg-orange-500' :
          item.priority === 'medium' ? 'bg-yellow-500' :
          'bg-gray-500'
        }`} title={`Priority: ${item.priority}`} />

        {/* GitHub indicator */}
        {hasGithub && <Github className="w-3 h-3 text-gray-500" />}

        {/* Menu */}
        <CardMenuCompact
          isOpen={menuOpen}
          onOpenChange={setMenuOpen}
          onAction={(action) => onAction?.(action, item)}
          status={item.status}
          hasAIResult={!!aiResult}
        />
      </div>
    </motion.div>
  );
}
