import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Code2, Palette } from 'lucide-react';
import { useBacklog } from '../../../hooks/useBacklog';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import BacklogSection from './BacklogSection';
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
    acceptProposal, 
    rejectProposal, 
    createBacklogItem,
    fetchBacklogItems
  } = useBacklog(activeProject?.id || null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Group all items by agent type
  const groupedItems = useMemo(() => {
    const allItems = [
      ...backlogProposals,
      ...customBacklogItems.map(item => ({
        ...item,
        agent: 'developer' as const, // Default custom items to developer for now
        timestamp: item.timestamp
      }))
    ];

    const developerItems = allItems.filter(item => item.agent === 'developer');
    const artistItems = allItems.filter(item => item.agent === 'artist');

    return {
      developer: developerItems,
      artist: artistItems
    };
  }, [backlogProposals, customBacklogItems]);

  const handleOpenForm = () => {
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
  };

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
        {/* Two Column Layout - Developer and Artist */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Developer Column */}
          <BacklogSection
            agentType="developer"
            items={groupedItems.developer}
            icon={Code2}
            title="Developer Tasks"
            newItemIds={newItemIds}
            onAccept={acceptProposal}
            onReject={rejectProposal}
            onOpenForm={handleOpenForm}
            onRefresh={fetchBacklogItems}
          />

          {/* Artist Column */}
          <BacklogSection
            agentType="artist"
            items={groupedItems.artist}
            icon={Palette}
            title="Design Tasks"
            newItemIds={newItemIds}
            onAccept={acceptProposal}
            onReject={rejectProposal}
            onOpenForm={handleOpenForm}
            onRefresh={fetchBacklogItems}
          />
        </div>

        {/* Floating Action Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenForm}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 rounded-full shadow-lg shadow-cyan-500/25 transition-all duration-200 z-50"
          title="Add Custom Item"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </GlowCard>

      {/* Custom Backlog Form Modal */}
      <BacklogFormAdd
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleAddCustomBacklogItem}
      />
    </>
  );
};