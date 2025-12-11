/**
 * Trigger Selector Component
 * Allows selection between manual and event-based triggers for chain execution
 */

'use client';

import React from 'react';
import { Play, Zap } from 'lucide-react';
import { ChainTrigger, TriggerType } from '../types/chainTypes';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface TriggerSelectorProps {
  trigger: ChainTrigger;
  onChange: (trigger: ChainTrigger) => void;
}

export default function TriggerSelector({ trigger, onChange }: TriggerSelectorProps) {
  const { activeProject } = useActiveProjectStore();

  const handleTypeChange = (type: TriggerType) => {
    if (type === 'manual') {
      onChange({ type: 'manual' });
    } else {
      onChange({
        type: 'event',
        eventType: '',
        projectId: activeProject?.id || '',
      });
    }
  };

  const handleEventChange = (field: 'eventType' | 'eventTitle', value: string) => {
    if (trigger.type !== 'event') return;

    onChange({
      ...trigger,
      [field]: value,
    });
  };

  return (
    <div className="space-y-3">
      {/* Trigger Type Selection */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
          Trigger Type
        </label>
        <div className="flex gap-2">
          {/* Manual Trigger */}
          <button
            onClick={() => handleTypeChange('manual')}
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              trigger.type === 'manual'
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Play className="w-4 h-4" />
            <div className="flex-1 text-left">
              <div className="text-xs font-medium">Manual</div>
              <div className="text-[10px] text-gray-500">Run on demand</div>
            </div>
          </button>

          {/* Event-based Trigger */}
          <button
            onClick={() => handleTypeChange('event')}
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              trigger.type === 'event'
                ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Zap className="w-4 h-4" />
            <div className="flex-1 text-left">
              <div className="text-xs font-medium">Event-based</div>
              <div className="text-[10px] text-gray-500">Auto-trigger</div>
            </div>
          </button>
        </div>
      </div>

      {/* Event Configuration (only shown when event-based is selected) */}
      {trigger.type === 'event' && (
        <div className="space-y-2 pt-1">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Event Type <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={trigger.eventType}
              onChange={(e) => handleEventChange('eventType', e.target.value)}
              placeholder="e.g., scan_completed, context_created"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              The event type to listen for in the database
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Event Title (optional)
            </label>
            <input
              type="text"
              value={trigger.eventTitle || ''}
              onChange={(e) => handleEventChange('eventTitle', e.target.value)}
              placeholder="e.g., Structure scan complete"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Filter events by specific title pattern
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Project
            </label>
            <div className="px-3 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg">
              <div className="text-xs text-gray-300">
                {activeProject?.name || 'No project selected'}
              </div>
              <div className="text-[10px] text-gray-600">
                {activeProject?.path || 'Select a project to continue'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
