/**
 * Commander Layout
 * Main Annette 2.0 interface with tab switcher: Annette (chat) / Voice Lab
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Bell, BellOff, Trash2, Volume2, VolumeX, FlaskConical, Ear, Zap } from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useVoiceCompanionStore } from '@/stores/voiceCompanionStore';
import ChatPanel from './components/ChatPanel';
import DecisionPanel from './components/DecisionPanel';
import VoiceLabPanel from './components/VoiceLabPanel';
import AmbientVoicePanel from './components/AmbientVoicePanel';
import AutonomousAgentPanel from './components/AutonomousAgentPanel';

type Tab = 'annette' | 'voicelab' | 'companion' | 'autonomous';

export default function CommanderLayout() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const setSession = useAnnetteStore((s) => s.setSession);
  const clearMessages = useAnnetteStore((s) => s.clearMessages);
  const notificationsMuted = useAnnetteStore((s) => s.notificationsMuted);
  const toggleMute = useAnnetteStore((s) => s.toggleMute);
  const audioEnabled = useAnnetteStore((s) => s.audioEnabled);
  const toggleAudio = useAnnetteStore((s) => s.toggleAudio);
  const markAllRead = useAnnetteStore((s) => s.markAllRead);
  const companionIsActive = useVoiceCompanionStore((s) => s.isActive);
  const companionEngineState = useVoiceCompanionStore((s) => s.engineState);
  const [activeTab, setActiveTab] = useState<Tab>('annette');

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
      {/* Left panel (full width when Voice Lab active, 2/3 when Annette) */}
      <div className={`flex flex-col min-w-0 ${activeTab === 'annette' ? 'flex-1' : 'flex-1'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-200">Annette</h2>
              <p className="text-xs text-slate-500">Brain-powered AI assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'annette' && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 px-4 pt-1.5 pb-0 border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('annette')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
              activeTab === 'annette'
                ? 'text-cyan-400 bg-slate-800/50 border border-b-0 border-slate-700/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Annette
          </button>
          <button
            onClick={() => setActiveTab('voicelab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
              activeTab === 'voicelab'
                ? 'text-purple-400 bg-slate-800/50 border border-b-0 border-slate-700/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Voice Lab
          </button>
          <button
            onClick={() => setActiveTab('companion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
              activeTab === 'companion'
                ? 'text-emerald-400 bg-slate-800/50 border border-b-0 border-slate-700/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Ear className="w-3.5 h-3.5" />
            Companion
            {companionIsActive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  companionEngineState === 'listening' ? 'bg-emerald-400' : 'bg-cyan-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  companionEngineState === 'listening' ? 'bg-emerald-400' : 'bg-cyan-400'
                }`} />
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('autonomous')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
              activeTab === 'autonomous'
                ? 'text-amber-400 bg-slate-800/50 border border-b-0 border-slate-700/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Agent
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'annette' && <ChatPanel />}
          {activeTab === 'voicelab' && <VoiceLabPanel />}
          {activeTab === 'companion' && <AmbientVoicePanel />}
          {activeTab === 'autonomous' && <AutonomousAgentPanel />}
        </div>
      </div>

      {/* Right 1/3: Decision Panel (only in Annette tab) */}
      {activeTab === 'annette' && (
        <div className="w-80 flex-shrink-0">
          <DecisionPanel />
        </div>
      )}
    </div>
  );
}
