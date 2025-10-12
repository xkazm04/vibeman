/**
 * Conversation Testing Solution Component
 * Automated conversation testing with predefined sentences
 * Refactored into smaller components for better organization
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
  DEFAULT_LLM_MODELS,
  createLog,
  processTextMessage,
  ConversationMessage,
  generateEvaluationPrompt
} from '../lib';



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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const questionsRef = useRef<string[]>([]);
  const responsesRef = useRef<string[]>([]);
  const multiModelResponsesRef = useRef<Record<string, string[]>>({});
  const timingsRef = useRef<Array<{ llmMs?: number; ttsMs?: number; totalMs?: number }>>([]);

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

  const addLog = useCallback((type: SessionLog['type'], message: string, audioUrl?: string, timing?: { llmMs?: number; ttsMs?: number; totalMs?: number }) => {
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

      // Build conversation history from logs
      const conversationHistory: ConversationMessage[] = logs
        .filter(log => log.type === 'user' || log.type === 'assistant')
        .map(log => ({
          role: log.type,
          content: log.message
        }));

      // Process text message through pipeline with timing
      const result = await processTextMessage(sentence, conversationHistory, provider, model);

      // Track response and timing
      responsesRef.current.push(result.assistantText);
      timingsRef.current.push({
        llmMs: result.timing.llmMs,
        ttsMs: result.timing.ttsMs,
        totalMs: result.timing.totalMs
      });

      addLog('assistant', result.assistantText, result.audioUrl, {
        llmMs: result.timing.llmMs,
        ttsMs: result.timing.ttsMs,
        totalMs: result.timing.totalMs
      });

      // Reset to active state after receiving message
      setSessionState('active');

      // Play audio response
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
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
  }, [currentSentenceIndex, logs, provider, model, addLog, runEvaluation, testQuestions]);

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
    
    if (isMultiModel) {
      addLog('system', 'Starting MULTI-MODEL conversation test (Ollama, OpenAI, Anthropic, Gemini)');
      playNextSentenceMultiModel();
    } else {
      addLog('system', `Starting conversation test with ${provider} (${model})`);
      playNextSentence();
    }
  }, [provider, model, isMultiModel, addLog, playNextSentence, playNextSentenceMultiModel]);

  const stopConversation = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setSessionState('idle');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    addLog('system', 'Conversation test stopped');
  }, [addLog]);

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
        if (isMultiModel) {
          playNextMultiRef.current();
        } else {
          playNextRef.current();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSentenceIndex, isPlaying, isMultiModel, testQuestions.length]);

  return (
    <div className="space-y-4">
      {/* Horizontal Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConvModelSelector
            provider={provider}
            model={model}
            isMultiModel={isMultiModel}
            isPlaying={isPlaying}
            onProviderChange={handleProviderChange}
            onModelChange={setModel}
            onMultiModelChange={setIsMultiModel}
          />

          <ConvControls
            sessionState={sessionState}
            isPlaying={isPlaying}
            onStart={startConversation}
            onStop={stopConversation}
            onClear={clearLogs}
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
        {isMultiModel ? (
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
