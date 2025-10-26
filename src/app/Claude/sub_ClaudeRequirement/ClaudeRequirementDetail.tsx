'use client';
import React from 'react';
import { FileText } from 'lucide-react';
import { Requirement } from '../lib/requirementApi';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeRequirementDetailModal from '../ClaudeRequirementDetailModal';

interface ClaudeRequirementDetailProps {
  requirement: Requirement;
  projectPath: string;
}

export default function ClaudeRequirementDetail({
  requirement,
  projectPath,
}: ClaudeRequirementDetailProps) {
  const { showShellModal } = useGlobalModal();

  const handleViewDetail = () => {
    showShellModal(
      {
        title: 'Requirement Details',
        subtitle: 'View Claude Code requirement specification',
        icon: FileText,
        iconBgColor: 'from-purple-600/20 to-pink-600/20',
        iconColor: 'text-purple-400',
        maxWidth: 'max-w-4xl',
        maxHeight: 'max-h-[85vh]',
      },
      {
        content: { enabled: true },
        customContent: (
          <ClaudeRequirementDetailModal projectPath={projectPath} requirementName={requirement.name} />
        ),
        isTopMost: true,
      }
    );
  };

  return (
    <div
      className="flex-1 min-w-0 cursor-pointer hover:text-blue-400 transition-colors"
      onClick={handleViewDetail}
    >
      <p className="text-sm font-mono text-gray-300 truncate">/{requirement.name}</p>
      {requirement.startTime && (
        <p className="text-xs text-gray-500 mt-0.5">
          {requirement.startTime.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
