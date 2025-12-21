'use client';

import { useState } from 'react';
import { X, Activity, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityType, Actor } from '../../lib/types/activityTypes';
import { ACTIVITY_TYPE_LABELS, ACTOR_LABELS } from '../../lib/types/activityTypes';
import { ActivityTimeline } from './ActivityTimeline';
import { useActivity } from '../../hooks/useActivity';

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToItem?: (feedbackId: string) => void;
}

export function ActivityPanel({ isOpen, onClose, onJumpToItem }: ActivityPanelProps) {
  const { events, filterEvents } = useActivity();
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);

  const filteredEvents = filterEvents({
    types: selectedTypes.length ? selectedTypes : undefined,
    actors: selectedActors.length ? selectedActors : undefined,
  });

  const toggleType = (type: ActivityType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleActor = (actor: Actor) => {
    setSelectedActors(prev =>
      prev.includes(actor) ? prev.filter(a => a !== actor) : [...prev, actor]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full w-[320px] flex flex-col bg-gray-900
            border-r border-gray-700/50 shadow-2xl shadow-black/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-200">Activity</span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-gray-800
                text-gray-500">
                {events.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-700/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Filter className="w-3 h-3" />
              <span>Filter by</span>
            </div>

            {/* Actor filters */}
            <div className="flex flex-wrap gap-1">
              {(Object.keys(ACTOR_LABELS) as Actor[]).map(actor => (
                <button
                  key={actor}
                  onClick={() => toggleActor(actor)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedActors.includes(actor)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {ACTOR_LABELS[actor]}
                </button>
              ))}
            </div>

            {/* Type filters (scrollable) */}
            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
              {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).slice(0, 5).map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    selectedTypes.includes(type)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-400'
                  }`}
                >
                  {ACTIVITY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <ActivityTimeline
              events={filteredEvents}
              showFeedbackId
              onJumpToItem={onJumpToItem}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ActivityPanel;
