import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import AILeftPanel from './AILeftPanel';
import AIScanSelection from './AIScanSelection';
import FileScannerModal from './FileScanner/FileScannerModal';
import { SupportedProvider, DefaultProviderStorage } from '../../../lib/llm';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import { MarkdownViewer } from '../../../components/markdown';

interface AIContentSelectorProps {
  onSelectMode: (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask?: boolean) => void;
  activeProject: any;
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
      const response = await fetch('/api/disk/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `${activeProject.path}/context/high.md`
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content || '';

        showFullScreenModal(
          'AI Documentation',
          <div className="h-full overflow-y-auto">
            <MarkdownViewer
              content={content}
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
      console.error('Failed to load AI docs:', error);
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
        const response = await fetch('/api/disk/read-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: `${activeProject.path}/context/high.md`
          })
        });

        setAiDocsExist(response.ok);
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
        {/* Floating Orbs */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-blue-500/10 to-blue-500/10 blur-xl"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 2
            }}
          />
        ))}

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