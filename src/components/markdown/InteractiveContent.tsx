import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { findBestPlantUMLEncoding } from '@/utils/plantumlEncoder';

interface InteractiveContentProps {
  trigger: string;
  content: string;
  type: 'text' | 'plantuml';
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function InteractiveContent({ 
  trigger, 
  content, 
  type, 
  renderInlineContent 
}: InteractiveContentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerClick = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Trigger Word */}
      <span
        onClick={handleTriggerClick}
        className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-md cursor-pointer hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 text-purple-300 hover:text-purple-200 text-sm font-medium"
      >
        {trigger}
        <Maximize2 className="w-3 h-3 ml-1 opacity-70" />
      </span>

      {/* Modal Portal */}
      <AnimatePresence>
        {isOpen && typeof window !== 'undefined' && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleBackdropClick}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
                <h3 className="text-lg font-semibold text-white">
                  {trigger}
                </h3>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                {type === 'text' ? (
                  <div className="prose prose-invert max-w-none">
                    {content.split('\n').map((line, index) => (
                      <p key={index} className="text-gray-300 leading-relaxed mb-4">
                        {renderInlineContent(line)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <PlantUMLRenderer content={content} />
                )}
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}

// PlantUML Renderer Component
interface PlantUMLRendererProps {
  content: string;
}

function PlantUMLRenderer({ content }: PlantUMLRendererProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    const generatePlantUMLUrl = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Convert \n back to actual newlines for PlantUML
        let processedContent = content.replace(/\\n/g, '\n');
        
        console.log('Original PlantUML content:', content);
        console.log('After newline conversion:', processedContent);
        
        // Ensure the content starts and ends properly
        if (!processedContent.trim().startsWith('@startuml')) {
          processedContent = '@startuml\n' + processedContent;
          console.log('Added @startuml at start');
        }
        if (!processedContent.trim().endsWith('@enduml')) {
          processedContent = processedContent + '\n@enduml';
          console.log('Added @enduml at end');
        }
        
        console.log('Final processed PlantUML content:', processedContent);
        
        // Simple and reliable PlantUML encoding
        try {
          // Use hex encoding which is most reliable
          const utf8Bytes = new TextEncoder().encode(processedContent);
          let hex = '';
          for (let i = 0; i < utf8Bytes.length; i++) {
            hex += utf8Bytes[i].toString(16).padStart(2, '0');
          }
          const url = `https://www.plantuml.com/plantuml/svg/~h${hex}`;
          
          console.log('PlantUML URL:', url);
          setImageUrl(url);
        } catch (err) {
          console.error('PlantUML encoding error:', err);
          setError('Failed to encode PlantUML diagram');
        }
        
      } catch (err) {
        console.error('PlantUML Error:', err);
        setError('Failed to generate PlantUML diagram');
        setIsLoading(false);
      }
    };

    if (content.trim()) {
      generatePlantUMLUrl();
    }
  }, [content]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-3 text-gray-400">Generating diagram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400 mb-2">{error}</p>
        <p className="text-sm text-gray-400 mb-3">
          PlantUML content preview:
        </p>
        <pre className="text-sm text-gray-300 bg-gray-800 p-3 rounded overflow-x-auto max-h-64">
          {content.replace(/\\n/g, '\n')}
        </pre>
        <div className="mt-3 text-xs text-gray-500">
          <p>Troubleshooting tips:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check if PlantUML syntax is correct</li>
            <li>Ensure the diagram starts with @startuml and ends with @enduml</li>
            <li>Try simplifying the diagram to test basic functionality</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-gray-700">
      <img
        src={imageUrl}
        alt="PlantUML Diagram"
        className="max-w-full h-auto mx-auto"
        onError={() => setError('Failed to load PlantUML diagram')}
      />
      
      {/* Source Code Toggle */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
          View Source
        </summary>
        <pre className="mt-2 text-sm text-gray-300 bg-gray-800 p-3 rounded overflow-x-auto">
          {content.replace(/\\n/g, '\n')}
        </pre>
      </details>
    </div>
  );
}