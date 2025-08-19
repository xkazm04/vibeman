import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw } from 'lucide-react';
import { useActiveProjectStore } from '../../stores/activeProjectStore';

interface ReviewerPanelProps {
  onOpenReview?: () => void;
}

export default function ReviewerPanel({ onOpenReview }: ReviewerPanelProps) {
  const { activeProject } = useActiveProjectStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch pending review count
  const fetchPendingCount = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/reviewer/pending-count?projectId=${activeProject.id}`);
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh pending count
  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [activeProject?.id]);

  const handleReviewClick = () => {
    if (pendingCount > 0 && onOpenReview) {
      onOpenReview();
    }
  };

  const handleRefresh = () => {
    fetchPendingCount();
  };

  const handleRefreshAfterReview = () => {
    fetchPendingCount(); // Refresh count after review
  };

  return (
    <>
      <div className="relative flex items-center space-x-3 px-4 py-3 bg-gray-800/30 rounded-lg border border-gray-700/40 min-w-0">
        {/* Section Label */}
        <div className="absolute -top-2 left-2 px-2 py-0.5 bg-gray-900 rounded text-xs font-bold text-cyan-400 tracking-wider">
          REVIEWER
        </div>

        <div className="flex items-center space-x-3">
          {/* Review Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReviewClick}
            disabled={pendingCount === 0 || !activeProject}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 group ${pendingCount > 0
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-400'
              : 'bg-gray-700/30 border border-gray-600/30 text-gray-500 cursor-not-allowed'
              }`}
            title={pendingCount > 0 ? `Review ${pendingCount} pending file${pendingCount === 1 ? '' : 's'}` : 'No files to review'}
          >
            <Eye className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
            <span>Review</span>
            {pendingCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </motion.div>
            )}
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading || !activeProject}
            className="flex items-center justify-center w-8 h-8 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-md text-gray-400 hover:text-gray-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh pending count"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>


    </>
  );
}