'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import { readRequirement } from './lib/requirementApi';

interface ClaudeRequirementDetailModalProps {
  projectPath: string;
  requirementName: string;
}

export default function ClaudeRequirementDetailModal({
  projectPath,
  requirementName,
}: ClaudeRequirementDetailModalProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequirementContent();
  }, [requirementName]);

  const loadRequirementContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requirementContent = await readRequirement(projectPath, requirementName);
      setContent(requirementContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requirement');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading requirement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <FileText className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">/{requirementName}</h3>
          <p className="text-sm text-gray-400">Claude Code Requirement</p>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-6 max-h-[60vh] overflow-y-auto">
        <MarkdownViewer content={content} />
      </div>
    </div>
  );
}
