'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import type { BrainEvent } from '../lib/types';
import { COLORS, LABELS } from '../lib/constants';
import { relTime } from '../lib/helpers';

interface EventDetailDrawerProps {
  selectedEvent: BrainEvent | null;
  onDelete: (event: BrainEvent) => void;
  onClose: () => void;
}

export function EventDetailDrawer({ selectedEvent, onDelete, onClose }: EventDetailDrawerProps) {
  return (
    <AnimatePresence>
      {selectedEvent && (
        <motion.div
          key={selectedEvent.id}
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute bottom-0 left-0 right-0 z-50"
        >
          <div className="mx-auto max-w-md bg-zinc-900/90 backdrop-blur-2xl border border-zinc-600/30 border-b-0 rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] px-5 py-4">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-zinc-600/60" />
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1 self-stretch rounded-full mt-0.5" style={{ backgroundColor: COLORS[selectedEvent.type] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-200">{LABELS[selectedEvent.type]}</span>
                  <span className="text-[10px] text-zinc-500">{relTime(selectedEvent.timestamp)}</span>
                  <span className="text-[10px] text-zinc-500 ml-auto">{selectedEvent.context_name}</span>
                </div>
                <div className="text-sm font-medium text-zinc-100 mb-2">{selectedEvent.summary}</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-[80px]">
                      <div className="h-full rounded-full" style={{
                        width: `${(selectedEvent.weight / 2) * 100}%`,
                        backgroundColor: COLORS[selectedEvent.type],
                      }} />
                    </div>
                    <span className="text-[10px] text-zinc-500">{selectedEvent.weight.toFixed(1)}</span>
                  </div>
                  <button
                    onClick={() => onDelete(selectedEvent)}
                    aria-label="Delete event"
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  >
                    <Trash2 size={10} />
                    Delete
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close event details"
                className="p-1 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
