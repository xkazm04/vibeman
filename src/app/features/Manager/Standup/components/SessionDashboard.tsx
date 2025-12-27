/**
 * SessionDashboard Component
 * Live dashboard showing automation session progress and events
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAutomationSession,
  type ActiveSession,
  type SessionDetails,
  type AutomationSessionPhase,
} from '../hooks/useAutomationSession';

// ============ Phase Styling ============

const phaseConfig: Record<AutomationSessionPhase, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  pending: { label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: '...' },
  running: { label: 'Running', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '>' },
  exploring: { label: 'Exploring', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', icon: '?' },
  generating: { label: 'Generating', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: '+' },
  evaluating: { label: 'Evaluating', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: '=' },
  complete: { label: 'Complete', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: 'v' },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: 'x' },
};

// ============ Sub-Components ============

function ProgressBar({ progress, phase }: { progress: number; phase: AutomationSessionPhase }) {
  const config = phaseConfig[phase];
  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${config.bgColor.replace('/20', '')}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: AutomationSessionPhase }) {
  const config = phaseConfig[phase];
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

function SessionCard({
  session,
  isSelected,
  onClick,
}: {
  session: ActiveSession;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isActive = session.phase !== 'complete' && session.phase !== 'failed';

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-gray-800 border-purple-500/50'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200 truncate">
          {session.projectName || session.projectId.slice(0, 8)}
        </span>
        <PhaseIndicator phase={session.phase} />
      </div>

      {isActive && (
        <>
          <ProgressBar progress={session.progress} phase={session.phase} />
          <p className="text-xs text-gray-400 mt-1 truncate">{session.message}</p>
        </>
      )}

      {session.hasError && (
        <p className="text-xs text-red-400 mt-1 truncate">{session.errorMessage}</p>
      )}
    </motion.button>
  );
}

function EventItem({ event }: { event: { eventType: string; timestamp: string; data: Record<string, unknown> } }) {
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getEventDisplay = () => {
    switch (event.eventType) {
      case 'file_read':
        return {
          icon: '[]',
          color: 'text-cyan-400',
          text: event.data.file as string || 'Unknown file',
        };
      case 'finding':
        return {
          icon: '!',
          color: 'text-amber-400',
          text: event.data.finding as string || 'Finding',
        };
      case 'progress':
        return {
          icon: '%',
          color: 'text-blue-400',
          text: `${event.data.progress}% - ${event.data.message || ''}`,
        };
      case 'candidate':
        return {
          icon: '+',
          color: 'text-purple-400',
          text: (event.data.candidate as Record<string, unknown>)?.title as string || 'New candidate',
        };
      case 'evaluation':
        return {
          icon: '=',
          color: 'text-green-400',
          text: event.data.goalTitle as string || 'Evaluation',
        };
      case 'phase_change':
        return {
          icon: '>',
          color: 'text-gray-400',
          text: `${event.data.previousPhase} -> ${event.data.newPhase}`,
        };
      case 'error':
        return {
          icon: 'x',
          color: 'text-red-400',
          text: event.data.message as string || 'Error',
        };
      default:
        return {
          icon: '?',
          color: 'text-gray-500',
          text: JSON.stringify(event.data),
        };
    }
  };

  const display = getEventDisplay();

  return (
    <div className="flex items-start gap-2 py-1 border-b border-gray-800/50 last:border-0">
      <span className="text-xs text-gray-500 w-16 flex-shrink-0">{formatTime(event.timestamp)}</span>
      <span className={`text-xs w-4 flex-shrink-0 ${display.color}`}>{display.icon}</span>
      <span className="text-xs text-gray-300 truncate">{display.text}</span>
    </div>
  );
}

function SessionDetailsPanel({ session }: { session: SessionDetails }) {
  const [activeTab, setActiveTab] = useState<'events' | 'files' | 'findings'>('events');

  return (
    <div className="mt-4 border-t border-gray-700/50 pt-4">
      {/* Session Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <PhaseIndicator phase={session.phase} />
          <span className="text-sm text-gray-400">
            {session.progress}% complete
          </span>
        </div>
        <span className="text-xs text-gray-500">
          Started {new Date(session.startedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar progress={session.progress} phase={session.phase} />

      {/* Message */}
      {session.message && (
        <p className="text-sm text-gray-300 mt-2">{session.message}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mt-4 border-b border-gray-700/50">
        {[
          { key: 'events', label: 'Events', count: session.events.length },
          { key: 'files', label: 'Files', count: session.filesExplored.length },
          { key: 'findings', label: 'Findings', count: session.findings.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-3 max-h-48 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {session.events.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No events yet...</p>
              ) : (
                session.events.slice(-20).reverse().map(event => (
                  <EventItem key={event.id} event={event} />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {session.filesExplored.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No files explored yet...</p>
              ) : (
                session.filesExplored.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-cyan-400">[]</span>
                    <span className="text-gray-300 truncate">{file}</span>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'findings' && (
            <motion.div
              key="findings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {session.findings.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No findings yet...</p>
              ) : (
                session.findings.map((finding, idx) => (
                  <div key={idx} className="p-2 bg-gray-800/50 rounded border border-gray-700/50">
                    <p className="text-xs text-gray-300">{finding.finding}</p>
                    {finding.file && (
                      <p className="text-xs text-gray-500 mt-1">
                        {finding.file}{finding.line ? `:${finding.line}` : ''}
                      </p>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ Main Component ============

export default function SessionDashboard() {
  const {
    activeSessions,
    isLoading,
    selectedSession,
    isLoadingDetails,
    selectSession,
  } = useAutomationSession();

  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = activeSessions.filter(
    s => s.phase !== 'complete' && s.phase !== 'failed'
  ).length;

  const hasAnySession = activeSessions.length > 0;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : activeCount > 0 ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
            </span>
          ) : (
            <span className="w-3 h-3 rounded-full bg-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-200">
            Automation Sessions
          </span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
              {activeCount} active
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-500"
        >
          v
        </motion.span>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-700/50">
              {/* Session List */}
              <div className="mt-3 space-y-2">
                {activeSessions.map(session => (
                  <SessionCard
                    key={session.sessionId}
                    session={session}
                    isSelected={selectedSession?.sessionId === session.sessionId}
                    onClick={() => selectSession(
                      selectedSession?.sessionId === session.sessionId ? null : session.sessionId
                    )}
                  />
                ))}
              </div>

              {/* Selected Session Details */}
              {selectedSession && (
                <SessionDetailsPanel session={selectedSession} />
              )}

              {/* Loading indicator for details */}
              {isLoadingDetails && !selectedSession && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400 ml-2">Loading session details...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
