/**
 * TerminalMessageLine
 *
 * Renders a single terminal message with consistent type-based
 * icon, color, left border, and semantic timestamp markup.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, AlertCircle, ChevronRight, ArrowRight } from 'lucide-react';
import type { TerminalMessage } from '@/stores/contextGenerationStore';

const ICON_CLASS = 'w-3.5 h-3.5 shrink-0 mt-0.5';

const MESSAGE_CONFIG: Record<
  TerminalMessage['type'],
  { icon: React.ReactNode; textColor: string; borderColor: string }
> = {
  system: {
    icon: <Terminal className={`${ICON_CLASS} text-cyan-400`} />,
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-400/40',
  },
  error: {
    icon: <AlertCircle className={`${ICON_CLASS} text-red-400`} />,
    textColor: 'text-red-400',
    borderColor: 'border-red-400/40',
  },
  output: {
    icon: <ChevronRight className={`${ICON_CLASS} text-gray-400`} />,
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/30',
  },
  input: {
    icon: <ArrowRight className={`${ICON_CLASS} text-blue-400`} />,
    textColor: 'text-blue-400',
    borderColor: 'border-blue-400/40',
  },
};

function formatContent(content: string): string {
  return content.length > 200 ? content.slice(0, 200) + '...' : content;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[1].split('.')[0];
}

interface TerminalMessageLineProps {
  message: TerminalMessage;
}

export const TerminalMessageLine: React.FC<TerminalMessageLineProps> = ({ message }) => {
  const config = MESSAGE_CONFIG[message.type];
  const isoTimestamp = new Date(message.timestamp).toISOString();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-2 py-0.5 pl-2 border-l-2 ${config.borderColor} ${config.textColor}`}
    >
      {config.icon}
      <time
        dateTime={isoTimestamp}
        className="text-gray-500 text-xs font-mono shrink-0 mt-px select-none"
      >
        {formatTimestamp(message.timestamp)}
      </time>
      <span className="break-all">{formatContent(message.content)}</span>
    </motion.div>
  );
};
