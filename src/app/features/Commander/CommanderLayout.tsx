/**
 * Commander Layout
 * Main Annette 2.0 interface - 2/3 chat + 1/3 decision panel
 */

'use client';

import { useEffect, useCallback } from 'react';
import { Bot, Bell, BellOff, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ChatPanel from './components/ChatPanel';
import DecisionPanel from './components/DecisionPanel';

export default function CommanderLayout() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const setSession = useAnnetteStore((s) => s.setSession);
  const clearMessages = useAnnetteStore((s) => s.clearMessages);
  const notificationsMuted = useAnnetteStore((s) => s.notificationsMuted);
  const toggleMute = useAnnetteStore((s) => s.toggleMute);
  const audioEnabled = useAnnetteStore((s) => s.audioEnabled);
  const toggleAudio = useAnnetteStore((s) => s.toggleAudio);
  const markAllRead = useAnnetteStore((s) => s.markAllRead);

  // Initialize session when project changes
  useEffect(() => {
    if (activeProject?.id) {
      setSession(`session-${activeProject.id}-${Date.now()}`, activeProject.id);
      markAllRead();
    }
  }, [activeProject?.id, setSession, markAllRead]);

  const handleClearChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p className="text-sm">Select a project to start chatting with Annette.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-900/50">
      {/* Left 2/3: Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-200">Annette</h2>
              <p className="text-[10px] text-slate-500">Brain-powered AI assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleAudio}
              className={`p-1.5 rounded-lg transition-colors ${
                audioEnabled
                  ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              title={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
              title={notificationsMuted ? 'Unmute notifications' : 'Mute notifications'}
            >
              {notificationsMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>

      {/* Right 1/3: Decision Panel */}
      <div className="w-80 flex-shrink-0">
        <DecisionPanel />
      </div>
    </div>
  );
}
