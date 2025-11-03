import React, { useState, useCallback, useEffect } from 'react';
import { FileText, AlertCircle, ArrowLeft, Bot } from 'lucide-react';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { useGenerateAIDocs } from '../hooks/useGenerateAIDocs';
import ScanHighModalContent from './ScanHighModalContent';
import LoadingAnimation from './LoadingAnimation';
import { Project } from '@/types';

interface StructureAnalysis {
  fileCount?: number;
  folderCount?: number;
  features?: string[];
  technologies?: string[];
}

interface AIDocsDisplayProps {
  activeProject?: Project;
  analysis?: StructureAnalysis;
  provider?: string;
  onBack?: () => void;
}

export default function AIDocsDisplay({
  activeProject,
  analysis,
  provider,
  onBack
}: AIDocsDisplayProps) {
  const [content, setContent] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [showContent, setShowContent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true); // Track if modal should be shown

  const { generateDocs, isGenerating, error } = useGenerateAIDocs();
  const { showInfoModal, showFullScreenModal, hideModal, isModalOpen: globalModalOpen } = useGlobalModal();

  // Detect when modal is closed externally (X button, ESC key, backdrop click)
  useEffect(() => {
    if (!globalModalOpen && isModalOpen) {
      // Modal was closed externally, update our state
      setIsModalOpen(false);
      setShowContent(false);
      if (onBack) {
        onBack();
      }
    }
  }, [globalModalOpen, isModalOpen, onBack]);

  const handleGenerate = useCallback(async () => {
    if (!activeProject) {
      return;
    }

    try {
      const result = await generateDocs({
        projectName: activeProject.name,
        projectPath: activeProject.path,
        analysis: analysis || {},
        projectId: activeProject.id,
        provider
      });

      if (result.success && result.review) {
        setContent(result.review);
        setShowContent(true);
      }
    } catch (err) {
      // Error handled by useGenerateAIDocs hook
    }
  }, [activeProject, analysis, provider, generateDocs]);

  const handleClose = useCallback(() => {
    setShowContent(false);
    setIsModalOpen(false);
    hideModal(); // Properly close the modal
  }, [hideModal]);

  const handleBack = useCallback(() => {
    handleClose();
    if (onBack) {
      onBack();
    }
  }, [onBack, handleClose]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Show appropriate modal based on current state
  useEffect(() => {
    if (!isModalOpen) return; // Don't show modal if it's been closed

    if (isGenerating) {
      showInfoModal("Generating Documentation", <LoadingAnimation />, {
        subtitle: `AI is analyzing ${activeProject?.name || 'your project'}...`,
        icon: FileText,
        iconBgColor: "from-blue-800/60 to-blue-900/60",
        iconColor: "text-blue-300",
        maxWidth: "max-w-md",
        maxHeight: "max-h-[50vh]"
      });
    } else if (error) {
      showInfoModal("Generation Failed", (
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-6">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      ), {
        subtitle: "Unable to generate documentation",
        icon: AlertCircle,
        iconBgColor: "from-red-800/60 to-red-900/60",
        iconColor: "text-red-300",
        maxWidth: "max-w-md",
        maxHeight: "max-h-[50vh]"
      });
    } else if (showContent && content) {
      const modalContent = (
        <ScanHighModalContent
          content={content}
          onBack={handleBack}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          onContentChange={handleContentChange}
          activeProject={activeProject}
        />
      );

      showFullScreenModal("AI Project Documentation", modalContent, {
        subtitle: "Comprehensive analysis and insights for your project",
        icon: FileText,
        iconBgColor: "from-slate-800/60 to-slate-900/60",
        iconColor: "text-slate-300"
      });
    } else if (!showContent && !isGenerating && !error) {
      // Show initial generation interface
      showInfoModal("AI Documentation Generator", (
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400 mb-6">
            Generate comprehensive AI-powered documentation for{' '}
            <span className="text-blue-400 font-medium">{activeProject?.name || 'your project'}</span>
          </p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleGenerate}
              disabled={!activeProject}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Bot className="w-5 h-5" />
              <span>Generate Documentation</span>
            </button>
            {onBack && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>
      ), {
        subtitle: "Create comprehensive project analysis",
        icon: Bot,
        iconBgColor: "from-blue-800/60 to-blue-900/60",
        iconColor: "text-blue-300",
        maxWidth: "max-w-md",
        maxHeight: "max-h-[60vh]"
      });
    }
  }, [isModalOpen, isGenerating, error, showContent, content, previewMode, activeProject, showInfoModal, showFullScreenModal, handleGenerate, handleBack, onBack]);

  // Return null since we're using the global modal
  return null;
}