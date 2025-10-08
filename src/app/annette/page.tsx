'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TestStatus from './components/TestStatus';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import ChatDialog from './components/ChatDialog';
import RunnerRightPanel from '../runner/components/RunnerRightPanel';
import AnnetteBackground from './components/AnnetteBackground';
import AnnetteHeader from './components/AnnetteHeader';
import AnnetteViewToggle from './components/AnnetteViewToggle';
import AnnetteSystemLogs from './components/AnnetteSystemLogs';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'user' | 'system' | 'tool' | 'llm';
  message: string;
  data?: any;
  audioUrl?: string;
  audioError?: string;
  audioLoading?: boolean;
}

interface ConfirmationState {
  isWaiting: boolean;
  question: string;
  type: 'yes_no' | 'clarification';
  toolsToUse: any[];
  originalMessage: string;
  projectContext: any;
}

type VoicebotState = 'idle' | 'listening' | 'processing' | 'error' | 'awaiting_confirmation';

export default function AnnettePage() {
  const [state, setState] = useState<VoicebotState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'logs'>('chat');
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isWaiting: false,
    question: '',
    type: 'yes_no',
    toolsToUse: [],
    originalMessage: '',
    projectContext: null
  });

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleVoiceInput = async () => {
    if (state !== 'idle') return;

    setState('processing');
    addLog('system', 'Starting voice processing pipeline...');

    try {
      const hardcodedMessage = "How many goals are in this project?";
      addLog('user', `Simulated user input: "${hardcodedMessage}"`);

      const activeProjectStore = {
        "state": {
          "activeProject": {
            "id": "6546a5e3-78a0-4140-9b0f-5be5a9161189",
            "name": "investigator",
            "path": "C:\\Users\\kazda\\kiro\\investigator",
            "port": 3002,
            "type": "other",
            "allowMultipleInstances": false,
            "basePort": 3002,
            "runScript": "npm run dev"
          }
        },
        "version": 1
      };

      addLog('system', 'Sending request to LangGraph orchestrator...');

      const response = await fetch('/api/annette/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: hardcodedMessage,
          projectId: activeProjectStore.state.activeProject.id,
          projectContext: activeProjectStore
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.needsConfirmation) {
        setState('awaiting_confirmation');
        setConfirmation({
          isWaiting: true,
          question: result.confirmationQuestion,
          type: result.confirmationType,
          toolsToUse: result.toolsToUse,
          originalMessage: hardcodedMessage,
          projectContext: activeProjectStore
        });

        addLog('system', `Confidence: ${result.confidence}%`);
        addLog('system', `Awaiting confirmation: ${result.confirmationQuestion}`);
        return;
      }

      const llmResponse = result.response;

      if (result.userIntent) addLog('system', `User Intent: ${result.userIntent}`);
      if (result.confidence) addLog('system', `Confidence: ${result.confidence}%`);
      if (result.analysis) addLog('system', `Analysis: ${result.analysis}`);

      const llmLogId = `llm_${Date.now()}`;
      const newLog: LogEntry = {
        id: llmLogId,
        timestamp: new Date().toLocaleTimeString(),
        type: 'llm',
        message: `LLM Response: ${llmResponse}`,
        audioLoading: true
      };
      setLogs(prev => [...prev, newLog]);

      if (result.toolsUsed && result.toolsUsed.length > 0) {
        result.toolsUsed.forEach((tool: any) => {
          addLog('tool', `Tool used: ${tool.name}`, tool);
        });
      }

      addLog('system', 'Generating speech audio...');
      generateTextToSpeech(llmResponse, llmLogId);

      setState('idle');
      addLog('system', 'Voice processing pipeline completed');

    } catch (error) {
      console.error('Voice processing error:', error);
      addLog('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const generateTextToSpeech = async (text: string, logId: string) => {
    try {
      const response = await fetch('/api/voicebot/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        setLogs(prev => prev.map(log =>
          log.id === logId ? { ...log, audioUrl, audioLoading: false } : log
        ));

        const audio = new Audio(audioUrl);
        audio.play().catch(console.error);

        addLog('system', 'Speech audio generated and playing');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown TTS error' }));

        setLogs(prev => prev.map(log =>
          log.id === logId ? { ...log, audioError: errorData.error, audioLoading: false } : log
        ));

        addLog('system', `TTS Error: ${errorData.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';

      setLogs(prev => prev.map(log =>
        log.id === logId ? { ...log, audioError: errorMessage, audioLoading: false } : log
      ));

      addLog('system', `TTS Error: ${errorMessage}`);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  const handleChatMessage = async (message: string) => {
    if (!selectedProject) {
      throw new Error('Please select a project first');
    }

    setState('processing');

    try {
      const response = await fetch('/api/annette/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          projectId: selectedProject.id,
          projectContext: {
            state: { activeProject: selectedProject },
            version: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.needsConfirmation) {
        setState('awaiting_confirmation');
        setConfirmation({
          isWaiting: true,
          question: result.confirmationQuestion,
          type: result.confirmationType,
          toolsToUse: result.toolsUsed,
          originalMessage: message,
          projectContext: {
            state: { activeProject: selectedProject },
            version: 1
          }
        });

        return {
          response: `I need confirmation: ${result.confirmationQuestion}`,
          confidence: result.confidence,
          needsConfirmation: true
        };
      }

      setState('idle');
      return result;

    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      throw error;
    }
  };

  const handleAnnetteInteraction = (project: any) => {
    setSelectedProject(project);
    setViewMode('chat');
  };

  const handleConfirmation = async (confirmed: boolean) => {
    if (!confirmation.isWaiting) return;

    setState('processing');
    addLog('system', `User ${confirmed ? 'confirmed' : 'declined'} tool execution`);

    if (!confirmed) {
      setState('idle');
      setConfirmation({
        isWaiting: false,
        question: '',
        type: 'yes_no',
        toolsToUse: [],
        originalMessage: '',
        projectContext: null
      });
      addLog('system', 'Operation cancelled by user');
      return;
    }

    // Continue with confirmation logic...
    setState('idle');
    setConfirmation({
      isWaiting: false,
      question: '',
      type: 'yes_no',
      toolsToUse: [],
      originalMessage: '',
      projectContext: null
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900/30 to-blue-900/20 text-white relative overflow-hidden">
      <AnnetteBackground />

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <AnnetteHeader />
          <AnnetteViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* Main Neural Interface Grid */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-280px)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            {/* Primary Interface - Chat or System Logs */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {viewMode === 'chat' ? (
                  <motion.div
                    key="neural-chat"
                    initial={{ opacity: 0, x: -50, rotateY: -15 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    exit={{ opacity: 0, x: -50, rotateY: -15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full"
                  >
                    <ChatDialog
                      selectedProject={selectedProject}
                      onSendMessage={handleChatMessage}
                      isProcessing={state === 'processing'}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="system-logs"
                    initial={{ opacity: 0, x: -50, rotateY: 15 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    exit={{ opacity: 0, x: -50, rotateY: 15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full"
                  >
                    <AnnetteSystemLogs
                      logs={logs}
                      confirmation={confirmation}
                      state={state}
                      onVoiceInput={handleVoiceInput}
                      onConfirmation={handleConfirmation}
                      onClearLogs={clearLogs}
                      onPlayAudio={playAudio}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Neural Project Control Panel */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 50, rotateY: 15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
            >
              <RunnerRightPanel onAnnetteInteraction={handleAnnetteInteraction} />
            </motion.div>
          </motion.div>

          {/* Neural System Status Dashboard */}
          <motion.div
            className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
          >
            <motion.div
              className="lg:col-span-3"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ArchitectureDiagram />
            </motion.div>
            <motion.div
              className="lg:col-span-1"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <TestStatus />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}