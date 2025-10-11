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
import { ConfirmationState, LogEntry } from './lib/typesAnnette';
import { 
  sendToLangGraph, 
  processLangGraphResponse, 
  createConfirmationState, 
  resetConfirmationState 
} from './lib/langgraphHelpers';
import { generateTextToSpeech, playAudio } from './lib/ttsGen';
import { createProjectContext, getHardcodedActiveProject } from './lib/projectHelpers';
import { createLogEntry, createLLMResponseLog } from './lib/logHelpers';



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
    const newLog = createLogEntry(type, message, data);
    setLogs(prev => [...prev, newLog]);
  };

  const updateLog = (logId: string, updates: Partial<LogEntry>) => {
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, ...updates } : log
    ));
  };

  const handleVoiceInput = async () => {
    if (state !== 'idle') return;

    setState('processing');
    addLog('system', 'Starting voice processing pipeline...');

    try {
      const hardcodedMessage = "How many goals are in this project?";
      addLog('user', `Simulated user input: "${hardcodedMessage}"`);

      const activeProjectStore = getHardcodedActiveProject();
      addLog('system', 'Sending request to LangGraph orchestrator...');

      const result = await sendToLangGraph(
        hardcodedMessage,
        activeProjectStore.state.activeProject.id,
        activeProjectStore
      );

      if (result.needsConfirmation) {
        setState('awaiting_confirmation');
        setConfirmation(createConfirmationState(result, hardcodedMessage, activeProjectStore));
        addLog('system', `Confidence: ${result.confidence}%`);
        addLog('system', `Awaiting confirmation: ${result.confirmationQuestion}`);
        return;
      }

      const llmResponse = result.response;
      processLangGraphResponse(result, addLog);

      const llmLog = createLLMResponseLog(llmResponse);
      setLogs(prev => [...prev, llmLog]);

      addLog('system', 'Generating speech audio...');
      await generateTextToSpeech(llmResponse, llmLog.id, updateLog, addLog);

      setState('idle');
      addLog('system', 'Voice processing pipeline completed');

    } catch (error) {
      console.error('Voice processing error:', error);
      addLog('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };



  const handleChatMessage = async (message: string) => {
    if (!selectedProject) {
      throw new Error('Please select a project first');
    }

    setState('processing');

    try {
      const projectContext = createProjectContext(selectedProject);
      const result = await sendToLangGraph(message, selectedProject.id, projectContext);

      if (result.needsConfirmation) {
        setState('awaiting_confirmation');
        setConfirmation(createConfirmationState(result, message, projectContext));

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
      setConfirmation(resetConfirmationState());
      addLog('system', 'Operation cancelled by user');
      return;
    }

    // Continue with confirmation logic...
    setState('idle');
    setConfirmation(resetConfirmationState());
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