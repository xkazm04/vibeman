import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Download, Maximize2 } from 'lucide-react';

interface SimplePlantUMLProps {
  content: string;
  title?: string;
}

export default function SimplePlantUML({ content, title }: SimplePlantUMLProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const generatePlantUMLUrl = () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Convert \n back to actual newlines for PlantUML
        let processedContent = content.replace(/\\n/g, '\n');
        
        // Apply dark theme styling if not already present
        const darkThemeDirectives = `
!theme vibrant
skinparam backgroundColor #0f172a
skinparam defaultFontColor #e2e8f0
skinparam defaultFontSize 12
skinparam defaultFontName "Inter, system-ui, sans-serif"

' Class diagram colors
skinparam class {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
  HeaderBackgroundColor #334155
  AttributeFontColor #cbd5e1
  StereotypeFontColor #06b6d4
}

' Sequence diagram colors
skinparam sequence {
  ActorBackgroundColor #1e293b
  ActorBorderColor #475569
  ActorFontColor #e2e8f0
  ParticipantBackgroundColor #1e293b
  ParticipantBorderColor #475569
  ParticipantFontColor #e2e8f0
  LifeLineBackgroundColor #334155
  LifeLineBorderColor #64748b
  ArrowColor #06b6d4
  ArrowFontColor #e2e8f0
}

' Activity diagram colors
skinparam activity {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
  StartColor #10b981
  EndColor #ef4444
  BarColor #06b6d4
}

' Use case diagram colors
skinparam usecase {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
}

' Component diagram colors
skinparam component {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
}

' State diagram colors
skinparam state {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
  StartColor #10b981
  EndColor #ef4444
}

' Note colors
skinparam note {
  BackgroundColor #374151
  BorderColor #6b7280
  FontColor #d1d5db
}

' Package colors
skinparam package {
  BackgroundColor #1e293b
  BorderColor #475569
  FontColor #e2e8f0
}
`;

        // Check if content already has theme directives
        const hasTheme = processedContent.includes('!theme') || 
                        processedContent.includes('skinparam backgroundColor') ||
                        processedContent.includes('skinparam defaultFontColor');
        
        // Ensure the content starts and ends properly
        if (!processedContent.trim().startsWith('@startuml')) {
          processedContent = '@startuml\n' + processedContent;
        }
        
        // Insert dark theme directives after @startuml if not present
        if (!hasTheme) {
          const lines = processedContent.split('\n');
          const startIndex = lines.findIndex(line => line.trim().startsWith('@startuml'));
          if (startIndex !== -1) {
            lines.splice(startIndex + 1, 0, darkThemeDirectives);
            processedContent = lines.join('\n');
          }
        }
        
        if (!processedContent.trim().endsWith('@enduml')) {
          processedContent = processedContent + '\n@enduml';
        }
        
        // Use hex encoding (most reliable)
        const utf8Bytes = new TextEncoder().encode(processedContent);
        let hex = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          hex += utf8Bytes[i].toString(16).padStart(2, '0');
        }
        const url = `https://www.plantuml.com/plantuml/svg/~h${hex}`;
        
        setImageUrl(url);
        setIsLoading(false);
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

  const downloadDiagram = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${title || 'plantuml-diagram'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-32 bg-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm"
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
        <span className="ml-3 text-gray-400 text-sm">Generating diagram...</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm"
      >
        <p className="text-red-400 text-sm mb-2 font-medium">{error}</p>
        <button
          onClick={() => setShowSource(!showSource)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          {showSource ? <EyeOff size={14} /> : <Eye size={14} />}
          {showSource ? 'Hide' : 'View'} PlantUML Source
        </button>
        {showSource && (
          <motion.pre 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 text-xs text-gray-300 bg-gray-800/80 p-3 rounded-lg overflow-x-auto border border-gray-700"
          >
            {content.replace(/\\n/g, '\n')}
          </motion.pre>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/40 to-gray-800/40 rounded-xl p-6 border border-gray-700/50 my-6 backdrop-blur-sm shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              {title}
            </h4>
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSource(!showSource)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              title={showSource ? 'Hide source' : 'View source'}
            >
              {showSource ? <EyeOff size={14} /> : <Eye size={14} />}
              Source
            </button>
            
            <button
              onClick={downloadDiagram}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              title="Download SVG"
            >
              <Download size={14} />
              SVG
            </button>
            
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              title="View fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        
        {/* Source Code */}
        {showSource && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="bg-gray-900/60 rounded-lg border border-gray-700/50 overflow-hidden">
              <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
                <span className="text-xs text-gray-400 font-medium">PlantUML Source</span>
              </div>
              <pre className="p-4 text-xs text-gray-300 overflow-x-auto">
                {content.replace(/\\n/g, '\n')}
              </pre>
            </div>
          </motion.div>
        )}
        
        {/* Diagram */}
        <div className="flex justify-center bg-gray-950/30 rounded-lg p-4 border border-gray-700/30">
          <img
            src={imageUrl}
            alt={title || "PlantUML Diagram"}
            className="max-w-full h-auto rounded-lg shadow-lg"
            onError={() => setError('Failed to load PlantUML diagram')}
            style={{ 
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
              background: 'transparent'
            }}
          />
        </div>
      </motion.div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="max-w-full max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-sm bg-black/50 px-3 py-1 rounded-lg"
              >
                Close
              </button>
              <img
                src={imageUrl}
                alt={title || "PlantUML Diagram"}
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                style={{ 
                  filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))',
                  background: 'transparent'
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}