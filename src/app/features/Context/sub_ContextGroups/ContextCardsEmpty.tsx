import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Save } from 'lucide-react';
import { ContextGroup } from '../../../../stores/contextStore';
import ContextEditModal from '../sub_ContextGen/ContextEditModal';

interface ContextCardsEmptyProps {
  group?: ContextGroup;
  availableGroups: ContextGroup[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;
}

const ContextCardsEmpty = React.memo(({ 
  group, 
  availableGroups, 
  showFullScreenModal 
}: ContextCardsEmptyProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border"
          style={{
            backgroundColor: `${group?.color}10`,
            borderColor: `${group?.color}30`
          }}
        >
          <Plus
            className="w-10 h-10"
            style={{ color: `${group?.color}` }}
          />
        </div>
        <div
          className="absolute -inset-2 rounded-2xl opacity-50"
          style={{
            background: `linear-gradient(45deg, ${group?.color}20, transparent, ${group?.color}20)`,
            filter: 'blur(12px)',
          }}
        />
      </div>

      <div className="text-center space-y-4">
        <p className="text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent font-mono"
          style={{ backgroundImage: `linear-gradient(to right, ${group?.color}, ${group?.color}80)` }}>
          Neural Cluster Ready
        </p>
        <p className="text-sm text-gray-500 max-w-64 font-mono">
          Initialize context nodes or transfer existing data streams
        </p>

          <motion.button
            onClick={() => {
              showFullScreenModal(
                'Create New Context',
                <ContextEditModal
                  availableGroups={availableGroups}
                />,
                {
                  icon: Save,
                  iconBgColor: "from-cyan-500/20 to-blue-500/20",
                  iconColor: "text-cyan-400",
                  maxWidth: "max-w-[95vw]",
                  maxHeight: "max-h-[95vh]"
                }
              );
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all border border-cyan-500/30 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Save className="w-4 h-4" />
          </motion.button>
      </div>
    </motion.div>
  );
});

ContextCardsEmpty.displayName = 'ContextCardsEmpty';

export default ContextCardsEmpty;