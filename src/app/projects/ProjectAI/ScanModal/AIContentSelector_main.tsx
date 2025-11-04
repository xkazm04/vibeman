import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import AILeftPanel from './ScanLeftPanel';
import AIScanSelection from './AIScanSelection';
import ScanRightPanel from './ScanRightPanel';
import FileScannerModal from '../FileScanner/FileScannerModal';
import { SupportedProvider, DefaultProviderStorage } from '../../../../lib/llm';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { MarkdownViewer } from '../../../../components/markdown';
import { readAIDocs } from './lib/api';

interface ActiveProject {
  id?: string;
  name?: string;
  path?: string;
}

interface AIContentSelectorProps {
  onSelectMode: (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask?: boolean) => void;
  activeProject: ActiveProject | null;
  selectedProvider?: SupportedProvider;
  onProviderChange?: (provider: SupportedProvider) => void;
}

export default function AIContentSelector({ onSelectMode, activeProject, selectedProvider: externalProvider, onProviderChange }: AIContentSelectorProps) {
  const [backgroundTask, setBackgroundTask] = React.useState(false);
  const [aiDocsExist, setAiDocsExist] = React.useState(false);
  const [checkingDocs, setCheckingDocs] = React.useState(true);
  const [showFileScanner, setShowFileScanner] = React.useState(false);
  const [selectedProvider, setSelectedProvider] = React.useState<SupportedProvider>(() =>
    externalProvider || DefaultProviderStorage.getDefaultProvider()
  );
  const { showFullScreenModal } = useGlobalModal();

  // Update internal state when external provider changes
  React.useEffect(() => {
    if (externalProvider && externalProvider !== selectedProvider) {
      setSelectedProvider(externalProvider);
    }
  }, [externalProvider, selectedProvider]);

  const handleProviderSelect = (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    onProviderChange?.(provider);
  };

  const handleShowAIDocs = async () => {
    if (!activeProject?.path || !aiDocsExist) return;

    try {
      const result = await readAIDocs(activeProject.path);

      if (result.success && result.content) {
        showFullScreenModal(
          'AI Documentation',
          <div className="h-full overflow-y-auto">
            <MarkdownViewer
              content={result.content}
              className="bg-gray-900/30 backdrop-blur-sm rounded-lg p-6"
            />
          </div>,
          {
            subtitle: `${activeProject.name} - context/high.md`,
            icon: BookOpen,
            iconBgColor: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            maxWidth: 'max-w-7xl',
            maxHeight: 'max-h-[95vh]',
            backdropBlur: true
          }
        );
      }
    } catch (error) {
      // Error loading AI docs - silent fail
    }
  };

  // Check if AI docs exist
  React.useEffect(() => {
    const checkAIDocs = async () => {
      if (!activeProject?.path) {
        setCheckingDocs(false);
        return;
      }

      try {
        const result = await readAIDocs(activeProject.path);
        setAiDocsExist(result.success);
      } catch (error) {
        setAiDocsExist(false);
      } finally {
        setCheckingDocs(false);
      }
    };

    checkAIDocs();
  }, [activeProject?.path]);

  const handleSelectMode = (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask?: boolean) => {
    if (mode === 'file-scanner') {
      setShowFileScanner(true);
    } else {
      onSelectMode(mode, backgroundTask);
    }
  };



  return (
    <motion.div
      className="flex h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <AILeftPanel
        aiDocsExist={aiDocsExist}
        checkingDocs={checkingDocs}
        activeProject={activeProject}
        selectedProvider={selectedProvider}
        backgroundTask={backgroundTask}
        onProviderSelect={handleProviderSelect}
        onBackgroundTaskChange={setBackgroundTask}
        onShowAIDocs={handleShowAIDocs}
      />

      <AIScanSelection
        aiDocsExist={aiDocsExist}
        selectedProvider={selectedProvider}
        backgroundTask={backgroundTask}
        onSelectMode={handleSelectMode}
      />

      <ScanRightPanel projectId={activeProject?.id} />

      {/* File Scanner Modal */}
      <AnimatePresence>
        {showFileScanner && (
          <FileScannerModal
            activeProject={activeProject}
            onClose={() => setShowFileScanner(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}