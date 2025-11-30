/**
 * Manager Layout Component
 * Main wrapper for the Implementation Manager feature
 * Displays untested implementation logs and allows users to review and improve them
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { EnrichedImplementationLog } from './lib/types';
import ImplementationLogCard from './components/ImplementationLogCard';
import ImplementationLogDetail from './components/ImplementationLogDetail';
import NewTaskModal from './components/NewTaskModal';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useThemeStore } from '@/stores/themeStore';
import AnnettePanel from '../Annette/components/AnnettePanel';
import { acceptImplementation } from '@/lib/tools';

export default function ManagerLayout() {
  const [implementationLogs, setImplementationLogs] = useState<EnrichedImplementationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EnrichedImplementationLog | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Fetch implementation logs on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/implementation-logs/untested');
      const data = await response.json();
      if (data.success) {
        setImplementationLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching implementation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedLog) return;

    try {
      // Use reusable accept tool
      const result = await acceptImplementation(selectedLog.id);

      if (result.success) {
        // Remove from list
        setImplementationLogs(prev => prev.filter(log => log.id !== selectedLog.id));
        setSelectedLog(null);
      } else {
        console.error('Error accepting implementation:', result.error);
      }
    } catch (error) {
      console.error('Error accepting implementation:', error);
    }
  };

  const handleRequirementCreated = (requirementName: string) => {
    console.log('Requirement created:', requirementName);
    // Optionally refresh the logs or show a success notification
    // For now, just close the modal after a delay (handled in UserInputPanel)
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <AnnettePanel />

      {/* Header with Inline Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className={`px-4 py-2 rounded-lg ${colors.bgHover} border ${colors.borderHover} ${colors.textDark} hover:opacity-80 transition-all font-medium flex items-center gap-2 text-sm`}
            >
              <span className="text-lg">+</span> New Task
            </button>
          </div>
        </div>

        {/* Compact Inline Stats */}
        {!loading && implementationLogs.length > 0 && (
          <div className="flex items-center gap-4">
            {[
              { label: 'Total', value: implementationLogs.length, color: 'cyan' },
              { label: 'Projects', value: new Set(implementationLogs.map(l => l.project_id)).size, color: 'emerald' },
              { label: 'With Context', value: implementationLogs.filter(l => l.context_id).length, color: 'amber' },
              { label: 'Needs Review', value: implementationLogs.length, color: 'purple' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{stat.label}:</span>
                <span className={`text-lg font-bold text-${stat.color}-400 font-mono`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className={`w-12 h-12 border-4 ${colors.border} border-t-current ${colors.textDark} rounded-full animate-spin mx-auto mb-4`} />
            <p className="text-gray-400">Loading implementation logs...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && implementationLogs.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-gray-400">No untested implementations to review</p>
          </div>
        </div>
      )}

      {/* Feature Grid */}
      {!loading && implementationLogs.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {implementationLogs.map((log, index) => (
              <ImplementationLogCard
                key={log.id}
                log={log}
                index={index}
                onClick={() => setSelectedLog(log)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <ImplementationLogDetail
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
            onAccept={handleAccept}
            onRequirementCreated={handleRequirementCreated}
            projectPath={activeProject?.path}
          />
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      <AnimatePresence>
        {isNewTaskModalOpen && (
          <NewTaskModal
            onClose={() => setIsNewTaskModalOpen(false)}
            onRequirementCreated={handleRequirementCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
