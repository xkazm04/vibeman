/**
 * Post-Chain Event Editor
 * Allows configuration of events to emit after chain execution completes
 */

'use client';

import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { PostChainEvent } from '../types/chainTypes';

interface PostChainEventEditorProps {
  event: PostChainEvent | null;
  onChange: (event: PostChainEvent | null) => void;
}

export default function PostChainEventEditor({ event, onChange }: PostChainEventEditorProps) {
  const isEnabled = event?.enabled ?? false;

  const handleToggle = () => {
    if (isEnabled && event) {
      onChange({ ...event, enabled: false });
    } else {
      onChange({
        enabled: true,
        eventType: event?.eventType || '',
        eventTitle: event?.eventTitle || '',
        eventMessage: event?.eventMessage || '',
      });
    }
  };

  const handleChange = (field: 'eventType' | 'eventTitle' | 'eventMessage', value: string) => {
    if (!event) return;
    onChange({ ...event, [field]: value });
  };

  return (
    <div className="space-y-3">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Post-Chain Event
          </label>
          <p className="text-[10px] text-gray-600 mt-0.5">
            Emit an event when chain completes
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            isEnabled
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
          }`}
        >
          {isEnabled ? (
            <>
              <Bell className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Enabled</span>
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Disabled</span>
            </>
          )}
        </button>
      </div>

      {/* Event Configuration (only shown when enabled) */}
      {isEnabled && event && (
        <div className="space-y-2 pt-1">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Event Type <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={event.eventType}
              onChange={(e) => handleChange('eventType', e.target.value)}
              placeholder="e.g., chain_completed, pipeline_finished"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={event.eventTitle}
              onChange={(e) => handleChange('eventTitle', e.target.value)}
              placeholder="e.g., Full scan pipeline completed"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Event Message
            </label>
            <textarea
              value={event.eventMessage}
              onChange={(e) => handleChange('eventMessage', e.target.value)}
              placeholder="Enter a message to include with this event..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
            />
          </div>

          {/* Preview */}
          {event.eventType && event.eventTitle && (
            <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider mb-1.5">
                Event Preview
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="text-[10px] text-gray-500 w-16">Type:</span>
                  <span className="text-[10px] text-emerald-300">{event.eventType}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] text-gray-500 w-16">Title:</span>
                  <span className="text-[10px] text-emerald-300">{event.eventTitle}</span>
                </div>
                {event.eventMessage && (
                  <div className="flex gap-2">
                    <span className="text-[10px] text-gray-500 w-16">Message:</span>
                    <span className="text-[10px] text-emerald-300">{event.eventMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
