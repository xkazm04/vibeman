'use client';
import React from 'react';
import { X } from 'lucide-react';
import { DbIdea } from '@/app/db';

interface IdeaDetailHeaderProps {
  idea: DbIdea;
  onClose: () => void;
  getCategoryEmoji: (category: string) => string;
  getStatusColor: (status: string) => string;
}

export default function IdeaDetailHeader({
  idea,
  onClose,
  getCategoryEmoji,
  getStatusColor,
}: IdeaDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <span className="text-2xl">{getCategoryEmoji(idea.category)}</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-white leading-tight">
            {idea.title}
          </h2>
          <p className={`text-xs font-semibold uppercase mt-0.5 ${getStatusColor(idea.status)}`}>
            {idea.status}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        data-testid="idea-detail-close-button"
        className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
