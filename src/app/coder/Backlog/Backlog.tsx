import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Code2, Palette } from 'lucide-react';
import { useStore } from '../../../stores/nodeStore';
import BacklogItem from './BacklogItem';
import BacklogFormAdd from './BacklogFormAdd';
import { GlowCard } from '@/components/GlowCard';
import { agentThemes } from '@/helpers/typeStyles';

export default function Backlog() {
  const { backlogProposals, customBacklogItems, acceptProposal, rejectProposal, addCustomBacklogItem } = useStore();
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

  const totalItems = backlogProposals.length + customBacklogItems.length;

  const AgentSection = ({ 
    agentType, 
    items, 
    icon: Icon, 
    title 
  }: { 
    agentType: 'developer' | 'artist', 
    items: any[], 
    icon: React.ElementType, 
    title: string 
  }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${agentThemes[agentType].bg}`}>
            <Icon className={`w-5 h-5 ${agentType === 'developer' ? 'text-cyan-400' : 'text-pink-400'}`} />
          </div>
          <h3 className="text-lg font-semibold text-white font-mono">{title}</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${agentType === 'developer' ? 'bg-cyan-400' : 'bg-pink-400'}`}></div>
          <span>{items.length} items</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="space-y-4 pr-2">
          <AnimatePresence>
            {items.map((item) => (
              <BacklogItem
                key={item.id}
                proposal={item}
                onAccept={acceptProposal}
                onReject={rejectProposal}
              />
            ))}
          </AnimatePresence>
          
          {items.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${agentThemes[agentType].bg}`}>
                <Icon className={`w-8 h-8 ${agentType === 'developer' ? 'text-cyan-400/50' : 'text-pink-400/50'}`} />
              </div>
              <p className="text-sm mb-2">No {agentType} items yet</p>
              <p className="text-xs text-gray-600 mb-4">
                {agentType === 'developer' 
                  ? 'Development tasks and code improvements will appear here'
                  : 'Design and UI enhancement tasks will appear here'
                }
              </p>
              <button
                onClick={handleOpenForm}
                className={`text-sm transition-colors px-4 py-2 rounded-lg ${
                  agentType === 'developer' 
                    ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20' 
                    : 'text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20'
                }`}
              >
                Add your first {agentType} item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GlowCard className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white font-mono">Project Backlog</h2>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full"></span>
              <span>{totalItems} total items</span>
            </div>
          </div>
        </div>
        
        {/* Two Column Layout - Developer and Artist */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Developer Column */}
          <AgentSection
            agentType="developer"
            items={groupedItems.developer}
            icon={Code2}
            title="Developer Tasks"
          />

          {/* Artist Column */}
          <AgentSection
            agentType="artist"
            items={groupedItems.artist}
            icon={Palette}
            title="Design Tasks"
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
        onSubmit={addCustomBacklogItem}
      />
    </>
  );
};