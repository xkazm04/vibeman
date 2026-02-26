/**
 * Annette TopBar Widget
 * Minimized bot icon with unread badge, typing dots, and expandable dropdown.
 * Also owns the SSE notification stream connection (global lifecycle).
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import type { AnnetteNotification } from '@/lib/annette/notificationEngine';
import AnnetteDropdownPanel from './AnnetteDropdownPanel';

export default function AnnetteTopBarWidget() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const isWidgetOpen = useAnnetteStore((s) => s.isWidgetOpen);
  const unreadCount = useAnnetteStore((s) => s.unreadCount);
  const isLoading = useAnnetteStore((s) => s.isLoading);
  const toggleWidget = useAnnetteStore((s) => s.toggleWidget);
  const closeWidget = useAnnetteStore((s) => s.closeWidget);
  const addNotification = useAnnetteStore((s) => s.addNotification);

  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ─── SSE Notification Stream (global lifecycle) ───
  useEffect(() => {
    if (!activeProject?.id) return;

    const projectId = activeProject.id;
    const eventSource = new EventSource(`/api/annette/stream?projectId=${projectId}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('notification', (event) => {
      try {
        const notification: AnnetteNotification = JSON.parse(event.data);
        addNotification(notification);
      } catch {}
    });

    eventSource.onerror = () => {
      // Will auto-reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [activeProject?.id, addNotification]);

  // ─── Click-outside detection ───
  useEffect(() => {
    if (!isWidgetOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeWidget();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWidget();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWidgetOpen, closeWidget]);

  const handleToggle = useCallback(() => {
    toggleWidget();
  }, [toggleWidget]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-end">
      {/* Trigger Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none ${
          isWidgetOpen
            ? 'bg-cyan-500/20 border border-cyan-500/30'
            : 'bg-slate-800/40 border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800/60'
        }`}
        title="Annette"
        aria-label="Open Annette assistant"
        data-testid="annette-widget-trigger"
      >
        <Bot className={`w-4.5 h-4.5 ${isWidgetOpen ? 'text-cyan-400' : 'text-slate-400'}`} />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !isWidgetOpen && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
            >
              <span className="text-2xs text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && !isWidgetOpen && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                className="w-1 h-1 rounded-full bg-cyan-400"
              />
            ))}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isWidgetOpen && (
          <AnnetteDropdownPanel onClose={closeWidget} />
        )}
      </AnimatePresence>
    </div>
  );
}
