import React, { useState, useMemo } from 'react';
import { Code2, Palette, Plus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBacklog } from '../../../hooks/useBacklog';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import BacklogItem from './BacklogItem';
import BacklogFormAdd from './BacklogFormAdd';
import { GlowCard } from '@/components/GlowCard';

export default function Backlog() {
  const { activeProject } = useActiveProjectStore();
  const { isActive } = useAnalysisStore();
  const { 
    backlogProposals, 
    customBacklogItems, 
    loading, 
    error,
    newItemIds,
    createBacklogItem,
    fetchBacklogItems
  } = useBacklog(activeProject?.id || null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Combine and sort all items, limit to 20
  const allItems = useMemo(() => {
    const combined = [
      ...backlogProposals,
      ...customBacklogItems.map(item => ({
        ...item,
        agent: 'developer' as const, // Default custom items to developer for now
        timestamp: item.timestamp
      }))
    ];

    // Sort by timestamp (newest first) and limit to 20 items
    return combined
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [backlogProposals, customBacklogItems]);


  const handleAddCustomBacklogItem = async (itemData: any) => {
    await createBacklogItem({
      ...itemData,
      type: 'custom'
    });
  };

  if (loading) {
    return (
      <GlowCard className="p-6 h-full flex flex-col max-h-[60vh]">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading backlog items...</div>
        </div>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard className="p-6 h-full flex flex-col max-h-[60vh]">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </GlowCard>
    );
  }

  return (
    <>
      <GlowCard className={`p-6 h-full flex flex-col max-h-[60vh] ${
        isActive ? 'shadow-lg shadow-purple-500/20' : ''
      }`}>        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Backlog</h3>
            <span className="text-sm text-gray-400">({allItems.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchBacklogItems}
              className="p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 rounded-md text-gray-400 hover:text-gray-300 transition-all"
              title="Refresh backlog"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No backlog items yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {allItems.map((item) => (
                <div key={item.id} className="w-80 flex-shrink-0">
                  <BacklogItem
                    proposal={item}
                    isNew={newItemIds.has(item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </GlowCard>
    </>
  );
};