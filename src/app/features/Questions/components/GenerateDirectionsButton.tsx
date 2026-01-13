'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface GenerateResult {
  requirementPath?: string;
  requirementName?: string;
}

interface GenerateDirectionsButtonProps {
  onGenerate: (directionsPerContext: number) => Promise<GenerateResult | void>;
  selectedCount: number;
  disabled?: boolean;
}

export default function GenerateDirectionsButton({
  onGenerate,
  selectedCount,
  disabled = false
}: GenerateDirectionsButtonProps) {
  const [directionsPerContext, setDirectionsPerContext] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (selectedCount === 0) return;

    setGenerating(true);
    setStatus('idle');
    setMessage(null);

    try {
      const result = await onGenerate(directionsPerContext);
      setStatus('success');
      // Show requirement path in success message
      const pathMsg = result?.requirementPath
        ? ` → ${result.requirementPath}`
        : '';
      setMessage(`Requirement created!${pathMsg} Check TaskRunner to execute.`);

      // Clear success message after 8 seconds (longer to read path)
      setTimeout(() => {
        setStatus('idle');
        setMessage(null);
      }, 8000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const isDisabled = disabled || selectedCount === 0 || generating;
  const expectedDirections = selectedCount * directionsPerContext;

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
      <div className="flex items-center justify-between gap-4">
        {/* Directions per context input */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Directions per context:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={directionsPerContext}
            onChange={(e) => setDirectionsPerContext(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
            className="
              w-16 bg-gray-700/50 border border-gray-600/50 rounded-lg
              px-2 py-1 text-sm text-center text-gray-200
              focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            "
            disabled={generating}
          />
        </div>

        {/* Generate button */}
        <motion.button
          whileHover={isDisabled ? {} : { scale: 1.02 }}
          whileTap={isDisabled ? {} : { scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isDisabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-all duration-200
            ${isDisabled
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-500/20'
            }
          `}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Compass className="w-4 h-4" />
              <span>
                Generate for {selectedCount} context{selectedCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* Expected output info */}
      {selectedCount > 0 && !message && (
        <p className="text-xs text-gray-500 mt-2">
          This will generate ~{expectedDirections} directions total
        </p>
      )}

      {/* Status message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            flex items-center gap-2 mt-3 p-2 rounded-lg text-sm
            ${status === 'success' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}
          `}
        >
          {status === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message}</span>
        </motion.div>
      )}
    </div>
  );
}
