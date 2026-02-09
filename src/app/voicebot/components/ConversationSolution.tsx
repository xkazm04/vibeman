/**
 * Conversation Testing Solution Component
 * Automated conversation testing with predefined sentences
 * Supports ElevenLabs pipeline and Nova Sonic unified S2S
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import VoicebotSessionLogs from './VoicebotSessionLogs';
import MultiModelSessionLogs from './MultiModelSessionLogs';
import ConvModelSelector from './conversation/ConvModelSelector';
import ConvControls from './conversation/ConvControls';
import ConvTestQuestions from './conversation/ConvTestQuestions';
import {
  SessionLog,
  SessionState,
  LLMProvider,
  VoiceProvider,
  DEFAULT_LLM_MODELS,
  createLog,
  processTextMessage,
  processTextMessageNovaSonic,
  ConversationMessage,
  generateEvaluationPrompt
} from '../lib';
import { generateCallId, generateMessageId, isMonitoringEnabled } from '@/app/monitor/lib';



interface MultiModelLog {
  id: string;
  timestamp: string;
  question: string;
  responses: Array<{
    provider: LLMProvider;
    model: string;
    response: string;
    audioUrl?: string;
    timing?: { llmMs?: number; ttsMs?: number; totalMs?: number };
  }>;
}

export default function ConversationSolution() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [multiModelLogs, setMultiModelLogs] = useState<MultiModelLog[]>([]);
  const [provider, setProvider] = useState<LLMProvider>('ollama');
  const [model, setModel] = useState<string>(DEFAULT_LLM_MODELS.ollama);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testQuestions, setTestQuestions] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isMultiModel, setIsMultiModel] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  // Nova Sonic state
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('elevenlabs');
  const [novaVoiceId, setNovaVoiceId] = useState('tiffany');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const questionsRef = useRef<string[]>([]);
  const responsesRef = useRef<string[]>([]);
  const multiModelResponsesRef = useRef<Record<string, string[]>>({});
  const timingsRef = useRef<Array<{ llmMs?: number; ttsMs?: number; novaMs?: number; totalMs?: number }>>([]);
  const callStartTimeRef = useRef<string | null>(null);

  // Load test questions on mount
  useEffect(() => {
    loadTestQuestions();
  }, []);

  const loadTestQuestions = async () => {
    try {
      const response = await fetch('/api/voicebot/test-questions');
      const data = await response.json();
      if (data.success && data.questions) {
        setTestQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to load test questions:', error);
      // Set default questions if loading fails
      setTestQuestions([
        'What is artificial intelligence?',
        'How does machine learning work?',
        'Can you explain neural networks?',
        'Tell me about natural language processing',
        'Explain the difference between AI and machine learning'
      ]);
    }
  };

  const handleProviderChange = useCallback((newProvider: LLMProvider) => {
    setProvider(newProvider);
    setModel(DEFAULT_LLM_MODELS[newProvider]);
  }, []);

  const addLog = useCallback((type: SessionLog['type'], message: string, audioUrl?: string, timing?: { llmMs?: number; ttsMs?: number; novaMs?: number; totalMs?: number }) => {
    const log = createLog(type, message, audioUrl, timing);
    setLogs(prev => [...prev, log]);
  }, []);

  const runMultiModelEvaluation = useCallback(async () => {
    try {
      setIsEvaluating(true);
      addLog('system', 'Running AI evaluation of multi-model responses...');

      // Build comparative prompt
      const providers = Object.keys(multiModelResponsesRef.current) as LLMProvider[];
      let evaluationPrompt = `# Multi-Model Conversation Evaluation\n\nCompare the following responses from different AI models. Analyze each model's performance across all questions.\n\n`;

      // Add each question with all model responses
      questionsRef.current.forEach((question, idx) => {
        evaluationPrompt += `## Question ${idx + 1}: "${question}"\n\n`;
        providers.forEach(provider => {
          const response = multiModelResponsesRef.current[provider][idx];
          evaluationPrompt += `**${provider.toUpperCase()}**: ${response}\n\n`;
        });
      });

      evaluationPrompt += `\nProvide a comprehensive evaluation:\n1. Rate each model's quality (1-10)\n2. Identify strengths and weaknesses\n3. Note response consistency\n4. Overall recommendation`;

      // Call evaluation API
      const response = await fetch('/api/voicebot/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: evaluationPrompt })
      });

      if (!response.ok) {
        throw new Error('Evaluation request failed');
      }

      const result = await response.json();

      if (result.success) {
        setEvaluation(result.evaluation);
        addLog('system', 'Multi-model evaluation completed successfully');
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Multi-model evaluation error:', error);
      addLog('system', 'Evaluation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setEvaluation('Evaluation failed. Please ensure Ollama is running.');
    } finally {
      setIsEvaluating(false);
    }
  }, [addLog]);

  const runEvaluation = useCallback(async () => {
    try {
      setIsEvaluating(true);
      addLog('system', 'Running AI evaluation of conversation quality...');

      // Generate evaluation prompt
      const evaluationPrompt = generateEvaluationPrompt(
        questionsRef.current,
        responsesRef.current,
        timingsRef.current
      );

      // Call evaluation API
      const response = await fetch('/api/voicebot/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: evaluationPrompt })
      });

      if (!response.ok) {
        throw new Error('Evaluation request failed');
      }

      const result = await response.json();

      if (result.success) {
        setEvaluation(result.evaluation);
        addLog('system', 'Evaluation completed successfully');
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      addLog('system', 'Evaluation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setEvaluation('Evaluation failed. Please ensure Ollama is running.');
    } finally {
      setIsEvaluating(false);
    }
  }, [addLog]);

  const playNextSentenceMultiModel = useCallback(async () => {
    if (!isPlayingRef.current || currentSentenceIndex >= testQuestions.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setSessionState('idle');
      addLog('system', 'Multi-model conversation test completed');

      // Run multi-model evaluation
      if (currentSentenceIndex >= testQuestions.length && questionsRef.current.length > 0) {
        await runMultiModelEvaluation();
      }
      return;
    }

    const sentence = testQuestions[currentSentenceIndex];

    try {
      setSessionState('processing');
      addLog('user', sentence);

      // Track question
      questionsRef.current.push(sentence);

      // Build conversation history
      const conversationHistory: ConversationMessage[] = [];

      // Process with all providers in parallel
      const providers: LLMProvider[] = ['ollama', 'openai', 'anthropic', 'gemini'];
      const responses = await Promise.all(
        providers.map(async (prov) => {
          const providerModel = DEFAULT_LLM_MODELS[prov];
          try {
            const result = await processTextMessage(sentence, conversationHistory, prov, providerModel);
            return {
              provider: prov,
              model: providerModel,
              response: result.assistantText,
              audioUrl: result.audioUrl,
              timing: {
                llmMs: result.timing.llmMs,
                ttsMs: result.timing.ttsMs,
                totalMs: result.timing.totalMs
              }
            };
          } catch (error) {
            console.error(`Error with ${prov}:`, error);
            return {
              provider: prov,
              model: providerModel,
              response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timing: { llmMs: 0, ttsMs: 0, totalMs: 0 }
            };
          }
        })
      );

      // Track responses for each provider
      responses.forEach(({ provider: prov, response }) => {
        if (!multiModelResponsesRef.current[prov]) {
          multiModelResponsesRef.current[prov] = [];
        }
        multiModelResponsesRef.current[prov].push(response);
      });

      // Add to multi-model logs
      const multiLog: MultiModelLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        question: sentence,
        responses
      };
      setMultiModelLogs(prev => [...prev, multiLog]);

      // Reset to active state
      setSessionState('active');

      // Play first successful audio (prioritize Ollama)
      const audioResponse = responses.find(r => r.audioUrl);
      if (audioResponse?.audioUrl) {
        const audio = new Audio(audioResponse.audioUrl);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          audio.play();
        });
      }

      // Move to next sentence
      setCurrentSentenceIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error processing multi-model sentence:', error);
      addLog('system', 'Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [currentSentenceIndex, addLog, runMultiModelEvaluation, testQuestions]);

  const playNextSentence = useCallback(async () => {
    if (!isPlayingRef.current || currentSentenceIndex >= testQuestions.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setSessionState('idle');
      addLog('system', 'Conversation test completed');

      // Run evaluation after all questions
      if (currentSentenceIndex >= testQuestions.length && questionsRef.current.length > 0) {
        await runEvaluation();
      }
      return;
    }

    const sentence = testQuestions[currentSentenceIndex];

    try {
      setSessionState('processing');
      addLog('user', sentence);

      // Track question
      questionsRef.current.push(sentence);

      let assistantText: string;
      let audioUrl: string | undefined;
      let timing: { llmMs?: number; ttsMs?: number; novaMs?: number; totalMs?: number };

      if (voiceProvider === 'nova-sonic') {
        // Nova Sonic unified path
        const result = await processTextMessageNovaSonic(sentence, novaVoiceId);
        assistantText = result.assistantText;
        audioUrl = result.audioUrl;
        timing = {
          novaMs: result.timing.novaMs,
          totalMs: result.timing.totalMs,
        };
      } else {
        // ElevenLabs pipeline path (STT → LLM → TTS)
        const conversationHistory: ConversationMessage[] = logs
          .filter(log => log.type === 'user' || log.type === 'assistant')
          .map(log => ({
            role: log.type,
            content: log.message
          }));

        const result = await processTextMessage(sentence, conversationHistory, provider, model);
        assistantText = result.assistantText;
        audioUrl = result.audioUrl;
        timing = {
          llmMs: result.timing.llmMs,
          ttsMs: result.timing.ttsMs,
          totalMs: result.timing.totalMs,
        };
      }

      // Track response and timing
      responsesRef.current.push(assistantText);
      timingsRef.current.push(timing);

      // Track messages if monitoring is enabled
      if (currentCallId) {
        const timestamp = new Date().toISOString();

        // Track user message (question)
        fetch('/api/monitor/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: generateMessageId(),
            callId: currentCallId,
            role: 'user',
            content: sentence,
            timestamp,
            metadata: { questionIndex: currentSentenceIndex }
          })
        }).catch(error => console.error('Failed to track user message:', error));

        // Track assistant message (response)
        fetch('/api/monitor/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: generateMessageId(),
            callId: currentCallId,
            role: 'assistant',
            content: assistantText,
            timestamp: new Date().toISOString(),
            latencyMs: timing.totalMs,
            metadata: {
              ...timing,
              voiceProvider,
              provider: voiceProvider === 'nova-sonic' ? 'nova-sonic' : provider,
              model: voiceProvider === 'nova-sonic' ? 'amazon.nova-2-sonic-v1:0' : model,
            }
          })
        }).catch(error => console.error('Failed to track assistant message:', error));
      }

      const providerLabel = voiceProvider === 'nova-sonic' ? 'Nova Sonic' : provider;
      const timingDisplay = voiceProvider === 'nova-sonic'
        ? `[Nova: ${timing.novaMs}ms | Total: ${timing.totalMs}ms]`
        : `[LLM: ${timing.llmMs}ms | TTS: ${timing.ttsMs}ms | Total: ${timing.totalMs}ms]`;

      addLog('assistant', `${assistantText}\n\n${timingDisplay} (${providerLabel})`, audioUrl, timing);

      // Reset to active state after receiving message
      setSessionState('active');

      // Play audio response
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          audio.play();
        });
      }

      // Move to next sentence - state update will trigger useEffect
      setCurrentSentenceIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error processing sentence:', error);
      addLog('system', 'Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [currentSentenceIndex, logs, provider, model, addLog, runEvaluation, testQuestions, currentCallId, voiceProvider, novaVoiceId]);

  const startConversation = useCallback(() => {
    setCurrentSentenceIndex(0);
    setIsPlaying(true);
    isPlayingRef.current = true;
    setLogs([]);
    setMultiModelLogs([]);
    setEvaluation(null);
    questionsRef.current = [];
    responsesRef.current = [];
    timingsRef.current = [];
    multiModelResponsesRef.current = {};

    // Create monitoring call if enabled
    if (monitoring && isMonitoringEnabled()) {
      const callId = generateCallId();
      const startTime = new Date().toISOString();

      callStartTimeRef.current = startTime;
      setCurrentCallId(callId);

      fetch('/api/monitor/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          userId: 'conversation-test-user',
          startTime,
          status: 'active',
          intent: 'conversation-test',
          promptVersionId: voiceProvider === 'nova-sonic'
            ? `nova-sonic:${novaVoiceId}`
            : isMultiModel ? 'multi-model' : `${provider}:${model}`,
          metadata: {
            voiceProvider,
            provider: voiceProvider === 'nova-sonic' ? 'nova-sonic' : provider,
            model: voiceProvider === 'nova-sonic' ? 'amazon.nova-2-sonic-v1:0' : model,
            type: 'conversation-test',
            isMultiModel: voiceProvider === 'elevenlabs' && isMultiModel,
            questionCount: testQuestions.length
          }
        })
      }).catch(error => console.error('Failed to create monitoring call:', error));
    }

    if (voiceProvider === 'nova-sonic') {
      addLog('system', `Starting conversation test with Nova Sonic (voice: ${novaVoiceId})`);
      playNextSentence();
    } else if (isMultiModel) {
      addLog('system', 'Starting MULTI-MODEL conversation test (Ollama, OpenAI, Anthropic, Gemini)');
      playNextSentenceMultiModel();
    } else {
      addLog('system', `Starting conversation test with ${provider} (${model})`);
      playNextSentence();
    }
  }, [provider, model, isMultiModel, addLog, playNextSentence, playNextSentenceMultiModel, monitoring, testQuestions.length, voiceProvider, novaVoiceId]);

  const stopConversation = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setSessionState('idle');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Update monitoring call if enabled
    if (currentCallId && callStartTimeRef.current) {
      const endTime = new Date().toISOString();
      const startMs = new Date(callStartTimeRef.current).getTime();
      const endMs = new Date(endTime).getTime();
      const duration = endMs - startMs;

      fetch('/api/monitor/calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: currentCallId,
          endTime,
          duration,
          status: 'completed',
          outcome: 'test-completed',
          metadata: {
            totalQuestions: questionsRef.current.length,
            totalResponses: responsesRef.current.length
          }
        })
      }).catch(error => console.error('Failed to update monitoring call:', error));

      setCurrentCallId(null);
      callStartTimeRef.current = null;
    }

    addLog('system', 'Conversation test stopped');
  }, [addLog, currentCallId]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setMultiModelLogs([]);
    setCurrentSentenceIndex(0);
    setEvaluation(null);
  }, []);  // Effect to trigger next sentence when counter increases
  // Using refs to avoid re-triggering when functions change
  const playNextRef = useRef(playNextSentence);
  playNextRef.current = playNextSentence;
  const playNextMultiRef = useRef(playNextSentenceMultiModel);
  playNextMultiRef.current = playNextSentenceMultiModel;

  useEffect(() => {
    if (isPlaying && currentSentenceIndex > 0 && currentSentenceIndex < testQuestions.length) {
      const timer = setTimeout(() => {
        if (voiceProvider === 'elevenlabs' && isMultiModel) {
          playNextMultiRef.current();
        } else {
          playNextRef.current();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSentenceIndex, isPlaying, isMultiModel, testQuestions.length, voiceProvider]);

  return (
    <div className="space-y-4">
      {/* Horizontal Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 border-2 ${
          voiceProvider === 'nova-sonic' ? 'border-orange-500/30 shadow-lg shadow-orange-500/10' : 'border-cyan-500/30 shadow-lg shadow-cyan-500/20'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConvModelSelector
            provider={provider}
            model={model}
            isMultiModel={isMultiModel}
            isPlaying={isPlaying}
            voiceProvider={voiceProvider}
            novaVoiceId={novaVoiceId}
            onProviderChange={handleProviderChange}
            onModelChange={setModel}
            onMultiModelChange={setIsMultiModel}
            onVoiceProviderChange={setVoiceProvider}
            onNovaVoiceChange={setNovaVoiceId}
          />

          <ConvControls
            sessionState={sessionState}
            isPlaying={isPlaying}
            onStart={startConversation}
            onStop={stopConversation}
            onClear={clearLogs}
            onMonitoringChange={setMonitoring}
          />
        </div>

        <ConvTestQuestions
          questions={testQuestions}
          currentIndex={currentSentenceIndex}
          isPlaying={isPlaying}
          onQuestionsChange={setTestQuestions}
        />
      </motion.div>

      {/* Full-Width Session Logs */}
      <div className="space-y-4">
        {voiceProvider === 'elevenlabs' && isMultiModel ? (
          <MultiModelSessionLogs
            logs={multiModelLogs}
            sessionState={sessionState}
            activeModels={[
              { provider: 'ollama', model: DEFAULT_LLM_MODELS.ollama },
              { provider: 'openai', model: DEFAULT_LLM_MODELS.openai },
              { provider: 'anthropic', model: DEFAULT_LLM_MODELS.anthropic },
              { provider: 'gemini', model: DEFAULT_LLM_MODELS.gemini }
            ]}
            onClearLogs={clearLogs}
          />
        ) : (
          <VoicebotSessionLogs
            logs={logs}
            sessionState={sessionState}
            isListening={isPlaying}
            onClearLogs={clearLogs}
          />
        )}

        {/* Evaluation Results */}
        {(evaluation || isEvaluating) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20"
          >
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
              <span>🤖</span>
              AI Conversation Evaluation
              {isEvaluating && (
                <span className="text-sm text-slate-400 animate-pulse">(Analyzing...)</span>
              )}
            </h3>

            {isEvaluating ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                  {evaluation}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
