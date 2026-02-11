'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface DesignTerminalProps {
  lines: string[];
  isRunning: boolean;
}

export function DesignTerminal({ lines, isRunning }: DesignTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  return (
    <div className="border border-primary/15 rounded-2xl overflow-hidden bg-background shadow-[0_0_15px_rgba(0,0,0,0.2)]">
      {/* Terminal Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full px-4 py-2 bg-primary/5 border-b border-primary/10 cursor-pointer hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
          )}
          <span className="text-xs text-muted-foreground/50 font-mono">
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                Analyzing...
              </span>
            ) : (
              'Complete'
            )}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/30 font-mono">
          {lines.length} lines
        </span>
      </button>

      {/* Terminal Content */}
      {!isCollapsed && (
        <div
          ref={terminalRef}
          onScroll={handleScroll}
          className="max-h-[200px] overflow-y-auto font-mono text-xs bg-background"
        >
          {lines.length === 0 ? (
            <div className="p-4 text-muted-foreground/30 text-center text-xs">
              No output yet...
            </div>
          ) : (
            <div className="p-3">
              {lines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.08 }}
                  className="flex gap-2 py-px"
                >
                  <span className="text-muted-foreground/20 select-none flex-shrink-0 w-8 text-right">
                    {(index + 1).toString().padStart(3, ' ')}
                  </span>
                  <span className="text-blue-400/80 break-all">{line}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
