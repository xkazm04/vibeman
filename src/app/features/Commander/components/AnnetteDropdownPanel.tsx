/**
 * Annette Dropdown Panel
 * Floating 320x400 panel with compact chat view and input
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Maximize2, Volume2, VolumeX, Bell, X } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useVoiceStore } from '@/stores/annette/voiceStore';
import { useWidgetStore } from '@/stores/annette/widgetStore';
import MiniChatPanel from './MiniChatPanel';
import MiniChatInput from './MiniChatInput';

function NotificationBar() {
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: 'info' | 'success' | 'warning' }>>([]);

  // Listen for brain notifications via custom events
  useEffect(() => {
    const handler = (e: CustomEvent<{ text: string; type: 'info' | 'success' | 'warning' }>) => {
      const id = `notif-${Date.now()}`;
      setNotifications(prev => [...prev.slice(-2), { id, ...e.detail }]);
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 8000);
    };
    window.addEventListener('annette-notification', handler as EventListener);
    return () => window.removeEventListener('annette-notification', handler as EventListener);
  }, []);

  if (notifications.length === 0) return null;

  const colorMap = {
    info: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
    success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  };

  return (
    <AnimatePresence>
      {notifications.map((notif) => (
        <motion.div
          key={notif.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`flex items-center gap-2 px-3 py-1.5 border-b text-xs ${colorMap[notif.type]}`}
        >
          <Bell className="w-3 h-3 flex-shrink-0" />
          <span className="flex-1 truncate">{notif.text}</span>
          <button
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
            className="flex-shrink-0 p-0.5 hover:bg-white/5 rounded transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export default function AnnetteDropdownPanel({ onClose }: { onClose: () => void }) {
  const setActiveModule = useOnboardingStore((s) => s.setActiveModule);
  const audioEnabled = useVoiceStore((s) => s.audioEnabled);
  const toggleAudio = useVoiceStore((s) => s.toggleAudio);

  const handleExpand = () => {
    setActiveModule('commander');
    onClose();
    useWidgetStore.getState().markAllRead();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full right-0 mt-2 z-50 w-80 h-[400px] flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-xs font-medium text-slate-200">Annette</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-md transition-colors ${
              audioEnabled
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
            title={audioEnabled ? 'Disable audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExpand}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
            title="Open full view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification toast bar */}
      <NotificationBar />

      {/* Chat body */}
      <MiniChatPanel />

      {/* Input */}
      <MiniChatInput />
    </motion.div>
  );
}
