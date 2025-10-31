'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Workflow, CheckCircle2, XCircle } from 'lucide-react';

interface ClaudeActionScriptedScanProps {
  projectPath: string;
  projectId: string;
  projectType: 'nextjs' | 'fastapi';
  disabled?: boolean;
  visible?: boolean;
  onComplete?: (savedContexts: number) => void;
}

export default function ClaudeActionScriptedScan({
  projectPath,
  projectId,
  projectType,
  disabled = false,
  visible = true,
  onComplete,
}: ClaudeActionScriptedScanProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string | null>(null);

  const handleScriptedScan = async () => {
    if (!projectId || !projectPath) {
      console.warn('[ScriptedScan] Missing project information');
      return;
    }

    if (isScanning) {
      console.warn('[ScriptedScan] Already scanning');
      return;
    }

    console.log('[ScriptedScan] Starting scripted context scan...');
    setIsScanning(true);
    setStatus('scanning');
    setResult(null);

    try {
      const response = await fetch('/api/contexts/scripted-scan-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectType,
          provider: 'ollama', // Can be made configurable
          model: undefined, // Will use provider default
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Scripted scan failed');
      }

      console.log('[ScriptedScan] Success:', data);
      setStatus('success');
      setResult(
        `Saved ${data.stats.saved} of ${data.stats.scanned} contexts${
          data.stats.skippedDuplicates > 0
            ? ` (${data.stats.skippedDuplicates} duplicates skipped)`
            : ''
        }`
      );

      // Call completion callback
      if (onComplete) {
        onComplete(data.stats.saved);
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setResult(null);
      }, 3000);
    } catch (error) {
      console.error('[ScriptedScan] Error:', error);
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'Failed to scan');

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setResult(null);
      }, 3000);
    } finally {
      setIsScanning(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="relative flex flex-col gap-1">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleScriptedScan}
        disabled={isScanning || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          isScanning || disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : status === 'success'
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
            : status === 'error'
            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
        }`}
        title="Run scripted context scan using structure templates"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Scanning...</span>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="w-3 h-3" />
            <span>Success!</span>
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="w-3 h-3" />
            <span>Error</span>
          </>
        ) : (
          <>
            <Workflow className="w-3 h-3" />
            <span>Scripted Scan</span>
          </>
        )}
      </motion.button>

      {/* Result message */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`text-xs px-2 py-1 rounded ${
            status === 'success'
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {result}
        </motion.div>
      )}

      {/* Progress indicator */}
      {isScanning && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full shadow-lg shadow-purple-500/50"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>
      )}
    </div>
  );
}
