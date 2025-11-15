'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Play, Clock, MessageCircle, RefreshCw } from 'lucide-react';
import { VoiceSession } from '../lib/voicebotTypes';
import { AnnetteTheme } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import { THEME_CONFIGS } from '@/stores/themeStore';
import { getProjectVoiceSessions, getAllVoiceSessions, deleteVoiceSession } from '../lib/voiceSessionStorage';

interface VoiceSessionHistoryProps {
  projectId?: string; // If provided, show only sessions for this project
  theme?: AnnetteTheme;
  onSessionSelect?: (session: VoiceSession) => void;
  onSessionDelete?: (sessionId: string) => void;
  className?: string;
}

/**
 * VoiceSessionHistory - Component for displaying and managing saved voice sessions
 *
 * Features:
 * - List all saved sessions (or filter by project)
 * - Session metadata display (date, duration, interaction count)
 * - Delete sessions
 * - Select session for replay
 * - Auto-refresh when sessions change
 */
export default function VoiceSessionHistory({
  projectId,
  theme = 'midnight',
  onSessionSelect,
  onSessionDelete,
  className = '',
}: VoiceSessionHistoryProps) {
  const themeConfig = THEME_CONFIGS[theme];
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSessions = projectId
        ? await getProjectVoiceSessions(projectId)
        : await getAllVoiceSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load sessions on mount and when projectId changes
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Delete a session
  const handleDelete = useCallback(async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering onSessionSelect

    if (!confirm('Delete this voice session? This action cannot be undone.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await deleteVoiceSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (onSessionDelete) {
        onSessionDelete(sessionId);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }, [onSessionDelete]);

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const durationMs = endTime.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden ${className}`}
      data-testid="voice-session-history"
    >
      {/* Ambient glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${themeConfig.colors.primary} opacity-5 blur-2xl pointer-events-none`}
      />

      {/* Header */}
      <div className="relative border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className={`w-4 h-4 ${themeConfig.colors.text}`} />
          <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
            SESSION HISTORY
          </h3>
          {sessions.length > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              ({sessions.length})
            </span>
          )}
        </div>

        <motion.button
          onClick={loadSessions}
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          className="p-1.5 rounded-lg bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50 transition-all"
          aria-label="Refresh sessions"
          data-testid="refresh-sessions-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Session list */}
      <div className="relative max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className={`w-6 h-6 border-2 border-t-transparent rounded-full ${themeConfig.colors.border}`}
            />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No saved sessions yet</p>
            <p className="text-xs mt-1">Start a conversation to create a session</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  data-testid={`session-item-${session.id}`}
                >
                  <motion.button
                    onClick={() => onSessionSelect?.(session)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full text-left bg-gray-950/40 border border-gray-700/30 rounded-lg p-3 hover:bg-gray-950/60 hover:border-gray-600/40 transition-all group"
                    disabled={deletingId === session.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        {/* Project name and date */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <h4 className="text-sm font-semibold text-gray-200 truncate">
                            {session.projectName}
                          </h4>
                          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                            {formatDate(session.startTime)}
                          </span>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{session.totalInteractions} interactions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(session.startTime, session.endTime)}</span>
                          </div>
                        </div>

                        {/* First interaction preview */}
                        {session.interactions.length > 0 && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                            {session.interactions[0].userText}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Play button */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSessionSelect?.(session);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-1.5 rounded-md ${themeConfig.colors.bg} ${themeConfig.colors.border} border transition-all`}
                          aria-label="Replay session"
                          data-testid={`replay-session-btn-${session.id}`}
                        >
                          <Play className={`w-3.5 h-3.5 ${themeConfig.colors.text}`} />
                        </motion.button>

                        {/* Delete button */}
                        <motion.button
                          onClick={(e) => handleDelete(session.id, e)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-1.5 rounded-md bg-gray-800/80 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                          aria-label="Delete session"
                          data-testid={`delete-session-btn-${session.id}`}
                          disabled={deletingId === session.id}
                        >
                          {deletingId === session.id ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full border-red-400"
                            />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Session status indicator */}
                    {!session.endTime && (
                      <div className="mt-2 pt-2 border-t border-gray-700/30">
                        <div className="flex items-center gap-1.5 text-xs">
                          <motion.div
                            className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${themeConfig.colors.primary}`}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <span className="text-gray-400">Active session</span>
                        </div>
                      </div>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div className={`h-0.5 bg-gradient-to-r ${themeConfig.colors.primary} opacity-30`} />
    </motion.div>
  );
}
