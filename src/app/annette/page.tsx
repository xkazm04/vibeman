'use client';

import { useState } from 'react';
import { Mic, MicOff, MessageSquare, Loader2, Play, X, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import TestStatus from './components/TestStatus';
import ArchitectureDiagram from './components/ArchitectureDiagram';

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

type VoicebotState = 'idle' | 'listening' | 'processing' | 'error';

export default function AnnettePage() {
  const [state, setState] = useState<VoicebotState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');

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
      // For testing, we'll hardcode the user message as requested
      const hardcodedMessage = "How many goals are in this project?";
      addLog('user', `Simulated user input: "${hardcodedMessage}"`);
      setCurrentMessage(hardcodedMessage);

      // Use real project data from activeProjectStore
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

      // Send to LangGraph orchestrator
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
      const llmResponse = result.response;
      
      // Add analysis results to logs
      if (result.userIntent) {
        addLog('system', `User Intent: ${result.userIntent}`);
      }
      if (result.analysis) {
        addLog('system', `Analysis: ${result.analysis}`);
      }
      
      // Add LLM response log entry with unique ID and loading state for TTS
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

      // Generate text-to-speech (non-blocking)
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
        
        // Update the log entry with audio URL and remove loading state
        setLogs(prev => prev.map(log => 
          log.id === logId ? { ...log, audioUrl, audioLoading: false } : log
        ));
        
        // Auto-play the audio
        const audio = new Audio(audioUrl);
        audio.play().catch(console.error);
        
        addLog('system', 'Speech audio generated and playing');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown TTS error' }));
        
        // Update the log entry with error and remove loading state
        setLogs(prev => prev.map(log => 
          log.id === logId ? { ...log, audioError: errorData.error, audioLoading: false } : log
        ));
        
        addLog('system', `TTS Error: ${errorData.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
      
      // Update the log entry with error and remove loading state
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

  const clearLogs = () => {
    setLogs([]);
    setCurrentMessage('');
  };

  const getStateConfig = () => {
    switch (state) {
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-400 border-blue-600/50 bg-blue-600/10',
          description: 'Processing...'
        };
      case 'error':
        return {
          icon: MicOff,
          color: 'text-red-400 border-red-600/50 bg-red-600/10',
          description: 'Error - Click to retry'
        };
      default:
        return {
          icon: MessageSquare,
          color: 'text-green-400 border-green-600/50 bg-green-600/10',
          description: 'Test Voice Pipeline'
        };
    }
  };

  const stateConfig = getStateConfig();
  const IconComponent = stateConfig.icon;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Annette - Voicebot Pipeline Prototype</h1>
          <p className="text-gray-400">
            Testing LangGraph orchestration with Ollama and tool selection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Control Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
            
            {/* Current Message Display */}
            {currentMessage && (
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300 mb-1">Current Message:</p>
                <p className="text-white">{currentMessage}</p>
              </div>
            )}

            {/* Voice Button */}
            <div className="flex flex-col items-center mb-6">
              <motion.button
                onClick={handleVoiceInput}
                disabled={state === 'processing'}
                className={`
                  relative w-24 h-24 rounded-full border-2 
                  ${stateConfig.color}
                  transition-all duration-300 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                whileHover={state === 'idle' ? { scale: 1.05 } : {}}
                whileTap={state === 'idle' ? { scale: 0.95 } : {}}
                animate={state === 'processing' ? {
                  rotate: 360,
                  transition: { duration: 2, repeat: Infinity, ease: "linear" }
                } : {}}
              >
                <div className="flex items-center justify-center w-full h-full">
                  <IconComponent size={32} />
                </div>
              </motion.button>
              
              <p className="mt-3 text-sm text-gray-400 text-center">
                {stateConfig.description}
              </p>
            </div>

            {/* Clear Logs Button */}
            <button
              onClick={clearLogs}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Clear Logs
            </button>
          </div>

          {/* Logs Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pipeline Logs</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No logs yet. Click the button to start testing.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg text-sm ${
                      log.type === 'user' ? 'bg-blue-900/30 border-l-4 border-blue-400' :
                      log.type === 'system' ? 'bg-gray-700/50 border-l-4 border-gray-400' :
                      log.type === 'tool' ? 'bg-purple-900/30 border-l-4 border-purple-400' :
                      'bg-green-900/30 border-l-4 border-green-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium text-xs uppercase tracking-wide ${
                          log.type === 'user' ? 'text-blue-300' :
                          log.type === 'system' ? 'text-gray-300' :
                          log.type === 'tool' ? 'text-purple-300' :
                          'text-green-300'
                        }`}>
                          {log.type}
                        </span>
                        {/* Audio controls for LLM responses */}
                        {log.type === 'llm' && (log.audioUrl || log.audioError || log.audioLoading) && (
                          <div className="flex items-center space-x-1">
                            {log.audioLoading ? (
                              <div className="p-1" title="Generating audio...">
                                <Volume2 className="w-3 h-3 text-blue-400 animate-pulse" />
                              </div>
                            ) : log.audioUrl ? (
                              <button
                                onClick={() => playAudio(log.audioUrl!)}
                                className="p-1 hover:bg-gray-600 rounded transition-colors"
                                title="Play audio"
                              >
                                <Play className="w-3 h-3 text-green-400" />
                              </button>
                            ) : log.audioError ? (
                              <div 
                                className="p-1 cursor-help"
                                title={`TTS Error: ${log.audioError}`}
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{log.timestamp}</span>
                    </div>
                    <p className="text-white">{log.message}</p>
                    {log.data && (
                      <pre className="mt-2 text-xs text-gray-400 bg-gray-900/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Architecture Diagram with System Status */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ArchitectureDiagram />
          </div>
          <div className="lg:col-span-1">
            <TestStatus />
          </div>
        </div>

        {/* Test Information */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Hardcoded Test Message:</h3>
              <p className="text-gray-400">"How many goals are in this project?"</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Active Project:</h3>
              <p className="text-gray-400">investigator (6546a5e3...)</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Available Tools:</h3>
              <p className="text-gray-400">GET /api/goals - Fetch project goals</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-2">LLM Model:</h3>
              <p className="text-gray-400">gpt-oss:20b (Ollama)</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Features:</h3>
              <p className="text-gray-400">Structured Prompts + LangGraph + TTS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}