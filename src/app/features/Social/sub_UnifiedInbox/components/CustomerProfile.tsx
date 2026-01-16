'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  AtSign,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Tag,
  Plus,
  X,
  Edit2,
  Clock,
  Award,
  Users,
  Twitter,
  Facebook,
  Instagram,
  MessageCircle,
  Star,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';
import type { KanbanChannel } from '../../lib/types/feedbackTypes';
import { HistoryTimeline } from './HistoryTimeline';
import {
  getCustomerValueTier,
  VALUE_TIER_COLORS,
  VALUE_TIER_LABELS,
  SENTIMENT_COLORS,
} from '../lib/types';

interface CustomerProfileProps {
  customer: UnifiedCustomer;
  threads: ConversationThread[];
  history: InteractionHistoryEntry[];
  onAddNote: (note: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSelectThread: (thread: ConversationThread) => void;
  onBack: () => void;
}

const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> = {
  email: Mail,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
};

const CHANNEL_COLORS: Record<KanbanChannel, string> = {
  email: 'text-blue-400',
  x: 'text-gray-200',
  facebook: 'text-blue-500',
  instagram: 'text-pink-400',
  support_chat: 'text-green-400',
  trustpilot: 'text-emerald-400',
  app_store: 'text-purple-400',
};

export function CustomerProfile({
  customer,
  threads,
  history,
  onAddNote,
  onAddTag,
  onRemoveTag,
  onSelectThread,
  onBack,
}: CustomerProfileProps) {
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const valueTier = getCustomerValueTier(customer.valueScore);
  const openThreads = threads.filter(t => t.status === 'open').length;

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      setIsAddingNote(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/40">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {customer.displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-gray-100 truncate">
                {customer.displayName}
              </h2>
              {customer.isVerified && (
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              {customer.primaryEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {customer.primaryEmail}
                </span>
              )}
              {customer.primaryHandle && (
                <span className="flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5" />
                  {customer.primaryHandle}
                </span>
              )}
            </div>

            {/* Value tier badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
                <Award className="w-3.5 h-3.5" />
                {VALUE_TIER_LABELS[valueTier]} Customer
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Value Score"
            value={customer.valueScore}
            color="text-cyan-400"
          />
          <StatCard
            icon={MessageSquare}
            label="Total Interactions"
            value={customer.totalInteractions}
            color="text-blue-400"
          />
          <StatCard
            icon={Clock}
            label="Open Threads"
            value={openThreads}
            color="text-yellow-400"
          />
          <StatCard
            icon={Users}
            label="Followers"
            value={formatNumber(customer.followers)}
            color="text-purple-400"
          />
        </div>

        {/* Channel Presence */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Channel Presence</h3>
          <div className="flex flex-wrap gap-2">
            {customer.channels.map((identity, index) => {
              const Icon = CHANNEL_ICONS[identity.channel];
              return (
                <div
                  key={`${identity.channel}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/40"
                >
                  <Icon className={`w-4 h-4 ${CHANNEL_COLORS[identity.channel]}`} />
                  <div className="text-sm">
                    <span className="text-gray-300">{identity.name}</span>
                    {identity.handle && (
                      <span className="text-gray-500 ml-1">@{identity.handle}</span>
                    )}
                  </div>
                  {identity.verified && (
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Customer Timeline */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Customer Since</h3>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300">
                {new Date(customer.firstInteractionAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">
              Last active {formatRelativeTime(customer.lastInteractionAt)}
            </span>
          </div>
        </section>

        {/* Sentiment */}
        {customer.averageSentiment && (
          <section>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Average Sentiment</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm capitalize ${SENTIMENT_COLORS[customer.averageSentiment]} bg-gray-800/60`}>
              {customer.averageSentiment}
            </span>
          </section>
        )}

        {/* Tags */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {customer.tags.map(tag => (
              <span
                key={tag}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
              >
                <Tag className="w-3.5 h-3.5" />
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Tag name"
                  className="w-24 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-cyan-500 text-gray-200"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 text-green-400 hover:text-green-300"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsAddingTag(false); setNewTag(''); }}
                  className="p-1 text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm text-gray-400 hover:text-gray-200 border border-dashed border-gray-600 hover:border-gray-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tag
              </button>
            )}
          </div>
        </section>

        {/* Notes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Notes</h3>
            {!isAddingNote && (
              <button
                onClick={() => setIsAddingNote(true)}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Note
              </button>
            )}
          </div>

          {isAddingNote && (
            <div className="mb-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this customer..."
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 text-gray-200 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setIsAddingNote(false); setNewNote(''); }}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded transition-colors"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}

          {customer.notes.length === 0 && !isAddingNote ? (
            <p className="text-sm text-gray-500">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {customer.notes.map((note, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/40 text-sm text-gray-300"
                >
                  {note}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Conversations */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Conversations ({threads.length})
          </h3>
          <div className="space-y-2">
            {threads.slice(0, 5).map(thread => (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className="w-full p-3 rounded-lg bg-gray-800/60 border border-gray-700/40 hover:border-cyan-500/40 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {thread.subject || 'No subject'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    thread.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' :
                    thread.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {thread.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{thread.messages.length} messages</span>
                  <span>•</span>
                  <span>{formatRelativeTime(thread.lastActivityAt)}</span>
                </div>
              </button>
            ))}
            {threads.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                +{threads.length - 5} more conversations
              </p>
            )}
          </div>
        </section>

        {/* Interaction History */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Interaction History</h3>
          <HistoryTimeline history={history} maxItems={10} />
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/40">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-lg font-semibold text-gray-200">{value}</span>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
