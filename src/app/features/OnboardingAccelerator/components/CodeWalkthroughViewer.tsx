'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCode,
  Lightbulb,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import type { CodeWalkthrough } from '@/stores/onboardingAcceleratorStore';

interface CodeWalkthroughViewerProps {
  walkthroughs: CodeWalkthrough[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onMarkViewed: (walkthroughId: string) => void;
  projectPath?: string;
}

export const CodeWalkthroughViewer: React.FC<CodeWalkthroughViewerProps> = ({
  walkthroughs,
  currentIndex,
  onIndexChange,
  onMarkViewed,
  projectPath,
}) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const [codeContent, setCodeContent] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  const current = walkthroughs[currentIndex];

  // Load code content when walkthrough changes
  useEffect(() => {
    if (!current || !projectPath) {
      setCodeContent('');
      return;
    }

    const loadCode = async () => {
      setIsLoadingCode(true);
      try {
        const response = await fetch(`/api/disk/read-file?path=${encodeURIComponent(projectPath + '/' + current.file_path)}`);
        if (response.ok) {
          const data = await response.json();
          const lines = (data.content || '').split('\n');
          const startLine = Math.max(0, current.start_line - 1);
          const endLine = Math.min(lines.length, current.end_line);
          setCodeContent(lines.slice(startLine, endLine).join('\n'));
        } else {
          setCodeContent('// Unable to load file content');
        }
      } catch {
        setCodeContent('// Error loading file');
      } finally {
        setIsLoadingCode(false);
      }
    };

    loadCode();
  }, [current, projectPath]);

  // Mark as viewed when viewed for more than 5 seconds
  useEffect(() => {
    if (!current || current.viewed) return;

    const timer = setTimeout(() => {
      onMarkViewed(current.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [current, onMarkViewed]);

  if (!current) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No walkthroughs available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <FileCode className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-white font-medium">{current.title}</h3>
            <p className="text-sm text-gray-400">{current.file_path}</p>
          </div>
          {current.viewed ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
              <CheckCircle className="w-3 h-3" />
              Viewed
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {currentIndex + 1} of {walkthroughs.length}
          </span>
          <motion.button
            onClick={() => onIndexChange(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="prev-walkthrough-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => onIndexChange(currentIndex + 1)}
            disabled={currentIndex === walkthroughs.length - 1}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="next-walkthrough-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Description */}
      {current.description && (
        <p className="text-gray-400 text-sm">{current.description}</p>
      )}

      {/* Code preview */}
      <div className="bg-gray-900 border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
          <span className="text-sm text-gray-400">
            Lines {current.start_line} - {current.end_line}
          </span>
          <button
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            data-testid="open-file-btn"
          >
            <ExternalLink className="w-3 h-3" />
            Open file
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          {isLoadingCode ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Loading code...
            </div>
          ) : (
            <pre className="text-sm text-gray-300 font-mono">
              <code>{codeContent || '// No code content available'}</code>
            </pre>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className={`w-4 h-4 ${colors.text}`} />
          <h4 className="text-white font-medium">Explanation</h4>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{current.explanation}</p>
      </div>

      {/* Key points */}
      {current.key_points.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h4 className="text-white font-medium">Key Takeaways</h4>
          </div>
          <ul className="space-y-2">
            {current.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className={`w-1.5 h-1.5 rounded-full ${colors.accent} mt-2`} />
                {point.text}
                {point.lineReference && (
                  <span className="text-gray-500">(line {point.lineReference})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related files */}
      {current.related_files.length > 0 && (
        <div className="pt-4 border-t border-gray-700/50">
          <h4 className="text-sm text-gray-400 mb-2">Related Files</h4>
          <div className="flex flex-wrap gap-2">
            {current.related_files.map((file, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400"
              >
                {file}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 pt-4">
        {walkthroughs.map((w, i) => (
          <button
            key={w.id}
            onClick={() => onIndexChange(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex
                ? `${colors.accent} w-4`
                : w.viewed
                ? 'bg-green-500'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            data-testid={`walkthrough-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
};
