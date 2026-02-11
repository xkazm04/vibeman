'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Square, Copy, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ExecutionTerminalProps {
  lines: string[];
  isRunning: boolean;
  onStop?: () => void;
  executionId?: string | null;
}

/** Lines that are metadata, not assistant markdown content */
const META_PREFIXES = ['Session started', 'Completed in', 'Cost: $', '> Using tool:', '  Tool result:', '[ERROR]', '=== '];

function isMeta(line: string): boolean {
  return META_PREFIXES.some(p => line.startsWith(p));
}

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
          // Fallback to terminal lines
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
  }, [lines]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  // Group lines into segments: meta lines render as styled spans, consecutive
  // non-meta lines join into markdown blocks.
  const segments = useMemo(() => {
    const result: { type: 'meta' | 'markdown'; content: string }[] = [];
    let mdBuffer: string[] = [];

    const flushMd = () => {
      if (mdBuffer.length > 0) {
        result.push({ type: 'markdown', content: mdBuffer.join('\n') });
        mdBuffer = [];
      }
    };

    for (const line of lines) {
      if (isMeta(line)) {
        flushMd();
        result.push({ type: 'meta', content: line });
      } else {
        mdBuffer.push(line);
      }
    }
    flushMd();
    return result;
  }, [lines]);

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
              </span>
            ) : (
              'Completed'
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

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        onScroll={handleScroll}
        className="max-h-[500px] overflow-y-auto text-sm bg-background"
      >
        {lines.length === 0 ? (
          <div className="p-6 text-muted-foreground/30 text-center font-mono">
            No output yet...
          </div>
        ) : (
          <div className="px-5 py-4 space-y-1">
            {segments.map((seg, i) =>
              seg.type === 'meta' ? (
                <div key={i} className="font-mono text-xs text-muted-foreground/50 py-0.5">
                  {seg.content}
                </div>
              ) : (
                <MarkdownRenderer key={i} content={seg.content} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
