'use client';

import { ProjectContext } from '../lib/typesAnnette';

interface AnnetteChatHeaderProps {
  selectedProject?: ProjectContext;
  isProcessing?: boolean;
  isListening?: boolean;
  audioLevels?: number[];
  isAudioActive?: boolean;
}

export default function AnnetteChatHeader({
  selectedProject,
  isProcessing,
  isListening,
  audioLevels,
  isAudioActive
}: AnnetteChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
      <h2 className="text-lg font-semibold text-gray-200">
        {selectedProject ? `Annette - ${selectedProject.name}` : 'Annette Chat'}
      </h2>
      {isProcessing && (
        <div className="text-xs text-cyan-400">Processing...</div>
      )}
    </div>
  );
}
