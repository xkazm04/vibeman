import React from 'react';
import { Layers, Info } from 'lucide-react';
import { GlowCard } from '@/components/GlowCard';
import { useContextStore } from '../../../stores/contextStore';
import ContextList from './ContextList';

export default function ContextPanel() {
  const { contexts } = useContextStore();

  return (
    <GlowCard className="p-6 h-full min-w-[400px] max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-white font-mono">Contexts</h2>
            <p className="text-sm text-gray-400">Saved file collections</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>{contexts.length}/10 saved</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">How to use contexts:</p>
            <p className="text-blue-300/80">
              Select files in the Code Tree, then save them as a context for future reference. 
              Contexts help organize related files for specific features or components.
            </p>
          </div>
        </div>
      </div>

      {/* Context List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-h-0 pr-2">
          <ContextList />
        </div>
      </div>
    </GlowCard>
  );
}