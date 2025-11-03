/**
 * Voicebot Testing Page
 * Three implementation approaches: Async Pipeline, WebSocket Realtime, Conversation Testing
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Zap, MessageSquare } from 'lucide-react';
import AsyncVoiceSolution from './components/AsyncVoiceSolution';
import WebSocketVoiceSolution from './components/WebSocketVoiceSolution';
import ConversationSolution from './components/ConversationSolution';
import PromptManager from './components/PromptManager';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

// Context type (matching the API response)
interface Context {
  id: string;
  projectId: string;
  groupId: string | null;
  name: string;
  description?: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
}

type VoiceSolution = 'async' | 'websocket' | 'conversation';

export default function VoicebotPage() {
  const [activeSolution, setActiveSolution] = useState<VoiceSolution>('async');
  
  // Project and Context state
  const projects = useProjectConfigStore((state) => state.getAllProjects());
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const activeContext = useActiveProjectStore((state) => state.activeContext);
  const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
  const setActiveContext = useActiveProjectStore((state) => state.setActiveContext);
  
  const [availableContexts, setAvailableContexts] = useState<Context[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);

  // Fetch contexts when project changes
  useEffect(() => {
    if (activeProject?.id) {
      setLoadingContexts(true);
      
      // Fetch contexts via API
      fetch(`/api/contexts?projectId=${encodeURIComponent(activeProject.id)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch contexts');
          }
          return response.json();
        })
        .then((data) => {
          if (data.success && data.data?.contexts) {
            setAvailableContexts(data.data.contexts);
          } else {
            setAvailableContexts([]);
          }
          setLoadingContexts(false);
        })
        .catch((error) => {          setAvailableContexts([]);
          setLoadingContexts(false);
        });
    } else {
      setAvailableContexts([]);
      setActiveContext(null);
    }
  }, [activeProject, setActiveContext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900/30 to-blue-900/20 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent mb-2 font-mono">
            VOICEBOT CALL SESSION
          </h1>
          <p className="text-cyan-300/60 font-mono">
            Experimental phone call-like voice interaction testing platform
          </p>
        </motion.div>

        {/* Project and Context Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex items-center space-x-4"
        >
          {/* Project Selector */}
          <div className="flex-1">
            <label className="block text-sm text-cyan-400/60 font-mono uppercase tracking-wider mb-2">
              Project Context
            </label>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const selectedProject = projects.find(p => p.id === e.target.value);
                if (selectedProject) {
                  setActiveProject(selectedProject);
                }
              }}
              className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
            >
              <option value="">No Project Selected</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Context Selector */}
          <div className="flex-1">
            <label className="block text-sm text-cyan-400/60 font-mono uppercase tracking-wider mb-2">
              Context
            </label>
            <select
              value={activeContext?.id || ''}
              onChange={(e) => {
                const selectedContext = availableContexts.find(c => c.id === e.target.value);
                setActiveContext(selectedContext || null);
              }}
              disabled={!activeProject || loadingContexts}
              className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!activeProject ? 'Select a project first' : loadingContexts ? 'Loading contexts...' : 'No Context Selected'}
              </option>
              {availableContexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Solution Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="inline-flex bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-1.5 backdrop-blur-sm">
            <motion.button
              onClick={() => setActiveSolution('async')}
              className={`
                relative px-6 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-300
                ${activeSolution === 'async'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeSolution === 'async' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span>ASYNC PIPELINE</span>
              </span>
              {activeSolution === 'async' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                />
              )}
            </motion.button>

            <motion.button
              onClick={() => setActiveSolution('websocket')}
              className={`
                relative px-6 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-300
                ${activeSolution === 'websocket'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeSolution === 'websocket' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>WEBSOCKET REALTIME</span>
              </span>
              {activeSolution === 'websocket' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                />
              )}
            </motion.button>

            <motion.button
              onClick={() => setActiveSolution('conversation')}
              className={`
                relative px-6 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-300
                ${activeSolution === 'conversation'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeSolution === 'conversation' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>CONVERSATION TEST</span>
              </span>
              {activeSolution === 'conversation' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                />
              )}
            </motion.button>
          </div>

          {/* Solution Info */}
          <motion.div
            key={activeSolution}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-4 bg-gray-900/50 border border-cyan-500/20 rounded-xl backdrop-blur-sm"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {activeSolution === 'async' ? (
                  <Layers className="w-5 h-5 text-cyan-400" />
                ) : activeSolution === 'websocket' ? (
                  <Zap className="w-5 h-5 text-cyan-400" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-cyan-400 mb-1 font-mono">
                  {activeSolution === 'async' ? 'ASYNC PIPELINE' : activeSolution === 'websocket' ? 'WEBSOCKET REALTIME' : 'CONVERSATION TEST'}
                </h3>
                <p className="text-sm text-gray-400 font-mono">
                  {activeSolution === 'async'
                    ? 'Voice input with multi-model LLM selection. Uses sequential API calls: Speech-to-Text (ElevenLabs) → LLM Processing (Ollama/OpenAI/Claude/Gemini) → Text-to-Speech (ElevenLabs).'
                    : activeSolution === 'websocket'
                    ? 'Uses POST endpoint for audio processing. WebSocket connection available for future real-time streaming features.'
                    : 'Automated conversation testing with predefined sentences. Tests text → LLM → TTS pipeline with multi-model support.'
                  }
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activeSolution === 'async' ? 'bg-green-400' :
                    activeSolution === 'conversation' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`} />
                  <span className="text-sm text-gray-500 font-mono">
                    {activeSolution === 'async' ? 'RECOMMENDED - Voice input with smart silence detection (10% threshold, 3s)' :
                     activeSolution === 'conversation' ? 'TESTING - Automated conversation flow' :
                     'EXPERIMENTAL - Using POST endpoint'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Active Solution Component */}
        <motion.div
          key={activeSolution}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {activeSolution === 'async' ? (
            <AsyncVoiceSolution />
          ) : activeSolution === 'websocket' ? (
            <WebSocketVoiceSolution />
          ) : (
            <ConversationSolution />
          )}
        </motion.div>

        {/* Technical Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-6 bg-gray-900/50 border border-cyan-500/20 rounded-2xl backdrop-blur-sm"
        >
          <h2 className="text-lg font-bold text-cyan-400 mb-4 font-mono">TECHNICAL DETAILS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Async Pipeline */}
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">ASYNC PIPELINE</h3>
              </div>
              <div className="space-y-2 text-sm font-mono text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Voice input with smart silence detection (10%, 3s)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">2.</span>
                  <span>Audio → ElevenLabs STT</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Text → Multi-model LLM (Ollama/OpenAI/Claude/Gemini)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Response → ElevenLabs TTS</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">5.</span>
                  <span>Play audio & display conversation</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-green-400">✓ Voice input</div>
                <div className="text-sm text-green-400">✓ Multi-model selection</div>
                <div className="text-sm text-green-400">✓ Smart silence detection</div>
              </div>
            </div>

            {/* WebSocket Realtime */}
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">WEBSOCKET REALTIME</h3>
              </div>
              <div className="space-y-2 text-sm font-mono text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Voice input with smart silence (10%, 3s)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">2.</span>
                  <span>Audio → POST /api/voicebot/realtime</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Server: Whisper STT → GPT-4 → OpenAI TTS</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Receive audio URL & play response</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-yellow-400">⚠ POST endpoint (not WebSocket yet)</div>
                <div className="text-sm text-blue-400">+ WebSocket for future streaming</div>
                <div className="text-sm text-green-400">✓ All-in-one pipeline</div>
              </div>
            </div>

            {/* Conversation Test */}
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">CONVERSATION TEST</h3>
              </div>
              <div className="space-y-2 text-sm font-mono text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Load 5 predefined test sentences</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">2.</span>
                  <span>Auto-send each sentence to LLM</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Response → ElevenLabs TTS</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Play audio & continue to next</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-sm text-blue-400">+ Automated testing</div>
                <div className="text-sm text-blue-400">+ Multi-model selection</div>
                <div className="text-sm text-blue-400">+ No voice input needed</div>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="mt-6 p-4 bg-black/30 rounded-xl border border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 mb-3 font-mono">API ENDPOINTS</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-mono">
              <div>
                <span className="text-cyan-400">POST</span>
                <span className="text-gray-400 ml-2">/api/voicebot/speech-to-text</span>
                <div className="text-gray-600 ml-6">ElevenLabs STT</div>
              </div>
              <div>
                <span className="text-cyan-400">POST</span>
                <span className="text-gray-400 ml-2">/api/voicebot/text-to-speech</span>
                <div className="text-gray-600 ml-6">ElevenLabs TTS</div>
              </div>
              <div>
                <span className="text-cyan-400">POST</span>
                <span className="text-gray-400 ml-2">/api/voicebot/llm</span>
                <div className="text-gray-600 ml-6">Multi-model LLM</div>
              </div>
              <div>
                <span className="text-yellow-400">POST</span>
                <span className="text-gray-400 ml-2">/api/voicebot/realtime</span>
                <div className="text-gray-600 ml-6">All-in-one pipeline</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Prompt Management Section */}
        <PromptManager />
      </div>
    </div>
  );
}
