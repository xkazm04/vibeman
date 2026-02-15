'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutionTerminal } from './ExecutionTerminal';

export function PersonaRunner() {
  const selectedPersona = usePersonaStore((state) => state.selectedPersona);
  const executePersona = usePersonaStore((state) => state.executePersona);
  const cancelExecution = usePersonaStore((state) => state.cancelExecution);
  const finishExecution = usePersonaStore((state) => state.finishExecution);
  const isExecuting = usePersonaStore((state) => state.isExecuting);
  const activeExecutionId = usePersonaStore((state) => state.activeExecutionId);

  const [inputData, setInputData] = useState('{}');
  const [showInputEditor, setShowInputEditor] = useState(false);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const personaId = selectedPersona?.id || '';

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectToStream = useCallback((executionId: string) => {
    // Close any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/personas/executions/${executionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.line) {
          setOutputLines((prev) => {
            const next = [...prev, data.line];
            // Cap at 500 lines to prevent browser OOM — full log available via Copy Log
            return next.length > 500 ? next.slice(-500) : next;
          });
        }

        if (data.done) {
          es.close();
          eventSourceRef.current = null;
          const status = data.status || 'completed';
          const statusLabel = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : status;
          setOutputLines((prev) => [...prev, '', `=== Execution ${statusLabel} ===`]);
          finishExecution(status);
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setOutputLines((prev) => [...prev, '', '=== Stream connection lost ===']);
      finishExecution('error');
    };
  }, [finishExecution]);

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const handleExecute = async () => {
    let parsedInput = {};
    if (inputData.trim()) {
      try {
        parsedInput = JSON.parse(inputData);
      } catch {
        alert('Invalid JSON input');
        return;
      }
    }

    setOutputLines([]);

    const executionId = await executePersona(personaId, parsedInput);
    if (executionId) {
      connectToStream(executionId);
    } else {
      setOutputLines(['ERROR: Failed to start execution']);
    }
  };

  const handleStop = () => {
    if (activeExecutionId) {
      // Close SSE stream first
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      cancelExecution(activeExecutionId);
      setOutputLines((prev) => [...prev, '', '=== Execution cancelled ===']);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">Run Persona</h3>

      {/* Input Data Section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowInputEditor(!showInputEditor)}
          className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
        >
          {showInputEditor ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Input Data (Optional)
        </button>

        <AnimatePresence>
          {showInputEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-32 px-4 py-3 bg-background/50 border border-border/50 rounded-2xl text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
                spellCheck={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-medium text-sm transition-all ${
          isExecuting
            ? 'bg-secondary/60 text-muted-foreground/40 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]'
        }`}
      >
        <Play className="w-5 h-5" />
        {isExecuting ? 'Executing...' : 'Execute Persona'}
      </button>

      {/* Terminal Output */}
      {(isExecuting || outputLines.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ExecutionTerminal
            lines={outputLines}
            isRunning={isExecuting}
            onStop={handleStop}
            executionId={activeExecutionId}
          />
        </motion.div>
      )}
    </div>
  );
}
