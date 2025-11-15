'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X } from 'lucide-react';
import { AnnetteTheme } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import { THEME_CONFIGS } from '@/stores/themeStore';

/**
 * Transcript entry for a single message
 */
export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'user' | 'assistant' | 'system';
  text: string;
  ssml?: string; // Optional SSML content
}

interface VoiceTranscriptProps {
  entries: TranscriptEntry[];
  theme?: AnnetteTheme;
  maxHeight?: string;
  enableSSMLHighlight?: boolean;
  onClear?: () => void;
  className?: string;
}

/**
 * VoiceTranscript - Reusable panel for displaying real-time voice transcripts
 *
 * Features:
 * - Real-time transcript display with scrollable history
 * - Copy-to-clipboard for individual entries and full transcript
 * - Optional SSML syntax highlighting
 * - Fully accessible with ARIA attributes
 * - Responsive design with Tailwind CSS
 * - Auto-scroll to latest entry
 * - Theme support matching Annette panels
 */
export default function VoiceTranscript({
  entries,
  theme = 'midnight',
  maxHeight = '400px',
  enableSSMLHighlight = false,
  onClear,
  className = '',
}: VoiceTranscriptProps) {
  const themeConfig = THEME_CONFIGS[theme];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Copy individual entry to clipboard
  const copyEntry = useCallback(async (entry: TranscriptEntry) => {
    const textToCopy = enableSSMLHighlight && entry.ssml ? entry.ssml : entry.text;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [enableSSMLHighlight]);

  // Copy all entries to clipboard
  const copyAllEntries = useCallback(async () => {
    const fullTranscript = entries.map(entry => {
      const timestamp = entry.timestamp.toLocaleTimeString();
      const speaker = entry.speaker.toUpperCase();
      const text = enableSSMLHighlight && entry.ssml ? entry.ssml : entry.text;
      return `[${timestamp}] ${speaker}: ${text}`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(fullTranscript);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [entries, enableSSMLHighlight]);

  // Render text with SSML highlighting if enabled
  const renderText = (entry: TranscriptEntry) => {
    const displayText = enableSSMLHighlight && entry.ssml ? entry.ssml : entry.text;

    if (enableSSMLHighlight && entry.ssml) {
      // Simple SSML syntax highlighting
      return (
        <span className="font-mono text-sm">
          {displayText.split(/(<[^>]+>)/).map((part, idx) => {
            if (part.startsWith('<') && part.endsWith('>')) {
              // SSML tag
              return (
                <span key={idx} className="text-purple-400 font-semibold">
                  {part}
                </span>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </span>
      );
    }

    return <span className="text-sm leading-relaxed">{displayText}</span>;
  };

  // Get speaker color based on theme
  const getSpeakerColor = (speaker: TranscriptEntry['speaker']) => {
    switch (speaker) {
      case 'user':
        return themeConfig.colors.primary;
      case 'assistant':
        return 'from-cyan-500 to-blue-500';
      case 'system':
        return 'from-gray-400 to-gray-500';
      default:
        return themeConfig.colors.primary;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden ${className}`}
      role="region"
      aria-label="Voice transcript"
      aria-live="polite"
      aria-atomic="false"
      data-testid="voice-transcript-panel"
    >
      {/* Ambient glow effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${themeConfig.colors.primary} opacity-5 blur-2xl pointer-events-none`}
      />

      {/* Header */}
      <div className="relative border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
          TRANSCRIPT
        </h3>

        <div className="flex items-center gap-2">
          {/* Copy All Button */}
          <motion.button
            onClick={copyAllEntries}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              copiedAll
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
            }`}
            disabled={entries.length === 0}
            aria-label="Copy all transcript entries"
            data-testid="copy-all-transcript-btn"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy All
              </>
            )}
          </motion.button>

          {/* Clear Button */}
          {onClear && (
            <motion.button
              onClick={onClear}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
              disabled={entries.length === 0}
              aria-label="Clear transcript"
              data-testid="clear-transcript-btn"
            >
              <X className="w-3 h-3" />
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* Transcript Entries */}
      <div
        ref={scrollRef}
        className="relative overflow-y-auto px-4 py-3 space-y-3"
        style={{ maxHeight }}
        data-testid="transcript-entries-container"
      >
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500 text-sm"
            >
              No transcript entries yet
            </motion.div>
          ) : (
            entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
                data-testid={`transcript-entry-${entry.speaker}`}
              >
                {/* Entry Container */}
                <div className="relative bg-gray-950/30 border border-gray-700/30 rounded-lg p-3 hover:bg-gray-950/50 transition-all">
                  {/* Speaker Badge + Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gradient-to-r ${getSpeakerColor(
                        entry.speaker
                      )} text-white`}
                    >
                      {entry.speaker.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="text-gray-300 mb-2 break-words">
                    {renderText(entry)}
                  </div>

                  {/* Copy Button (appears on hover) */}
                  <motion.button
                    onClick={() => copyEntry(entry)}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className={`absolute top-2 right-2 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                      copiedId === entry.id
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
                    }`}
                    aria-label={`Copy ${entry.speaker} message`}
                    data-testid={`copy-entry-btn-${entry.id}`}
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Bottom accent line */}
      <div className={`h-0.5 bg-gradient-to-r ${themeConfig.colors.primary} opacity-30`} />
    </motion.div>
  );
}
