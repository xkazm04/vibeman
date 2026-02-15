'use client';

import { useEffect, useRef, useState } from 'react';
import { Square, Copy, Check } from 'lucide-react';

interface ExecutionTerminalProps {
  lines: string[];
  isRunning: boolean;
  onStop?: () => void;
  executionId?: string | null;
}

/** Classify lines into visual categories for minimal styling */
function lineStyle(line: string): 'meta' | 'tool' | 'error' | 'status' | 'text' {
  if (line.startsWith('[ERROR]') || line.startsWith('[TIMEOUT]') || line.startsWith('[WARN]')) return 'error';
  if (line.startsWith('> Using tool:')) return 'tool';
  if (line.startsWith('  Tool result:')) return 'tool';
  if (line.startsWith('Session started') || line.startsWith('Completed in') || line.startsWith('Cost: $') || line.startsWith('=== ')) return 'status';
  if (line.startsWith('Process exited')) return 'meta';
  return 'text';
}

const STYLE_MAP = {
  meta: 'text-muted-foreground/40',
  tool: 'text-cyan-400/70',
  error: 'text-red-400/80',
  status: 'text-emerald-400/70 font-semibold',
  text: 'text-foreground/70',
} as const;

export function ExecutionTerminal({ lines, isRunning, onStop, executionId }: ExecutionTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [copied, setCopied] = useState(false);

  const handleCopyLog = async () => {
    if (executionId) {
      try {
        const res = await fetch(`/api/personas/executions/${executionId}/log`);
        if (res.ok) {
          const text = await res.text();
          await navigator.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(lines.join('\n'));
        }
      } catch {
        await navigator.clipboard.writeText(lines.join('\n'));
      }
    } else {
      await navigator.clipboard.writeText(lines.join('\n'));
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (terminalRef.current && shouldAutoScroll.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines.length]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden bg-background shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-b border-border/20">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs text-muted-foreground/50 ml-1 font-mono">
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Running
                <span className="text-muted-foreground/30">({lines.length} lines)</span>
              </span>
            ) : (
              `Completed (${lines.length} lines)`
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning && lines.length > 0 && (
            <button
              onClick={handleCopyLog}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Log'}
            </button>
          )}

          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content — simple monospace text, no heavy Markdown rendering */}
      <div
        ref={terminalRef}
        onScroll={handleScroll}
        className="max-h-[500px] overflow-y-auto text-sm bg-background font-mono"
      >
        {lines.length === 0 ? (
          <div className="p-6 text-muted-foreground/30 text-center">
            No output yet...
          </div>
        ) : (
          <div className="px-4 py-3">
            {lines.map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-2" />;
              const style = lineStyle(line);
              return (
                <div key={i} className={`text-xs leading-5 whitespace-pre-wrap break-words ${STYLE_MAP[style]}`}>
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
