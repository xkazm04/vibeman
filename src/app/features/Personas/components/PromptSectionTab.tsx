'use client';

import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PromptSectionTabProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  codeStyle?: boolean;
  viewMode?: boolean;
}

export function PromptSectionTab({
  title,
  icon,
  value,
  onChange,
  placeholder,
  codeStyle = false,
  viewMode = false,
}: PromptSectionTabProps) {
  const charCount = value.length;
  const [isEditing, setIsEditing] = useState(false);

  const showTextarea = !viewMode || isEditing;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/60">{icon}</span>
          <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {viewMode && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground/60 hover:text-foreground/80 bg-secondary/30 hover:bg-secondary/50 border border-border/30 rounded-lg transition-colors"
          >
            {isEditing ? (
              'Done'
            ) : (
              <>
                <Pencil className="w-3 h-3" />
                Edit
              </>
            )}
          </button>
        )}
      </div>

      {showTextarea ? (
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full min-h-[300px] px-4 py-3 bg-background/50 border border-border/50 rounded-2xl text-foreground text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30 ${
              codeStyle ? 'font-mono' : 'font-sans'
            }`}
            placeholder={placeholder}
            spellCheck={!codeStyle}
          />
          <div className="absolute bottom-3 right-4 text-xs text-muted-foreground/30 font-mono pointer-events-none">
            {charCount.toLocaleString()} chars
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-background/50 border border-border/50 rounded-2xl min-h-[100px]">
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-muted-foreground/30 italic">
              {placeholder || 'No content yet...'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
