import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { DbIdea } from '@/app/db';

interface ScanRightPanelProps {
  projectId?: string;
}

export default function ScanRightPanel({ projectId }: ScanRightPanelProps) {
  const [ideas, setIdeas] = React.useState<DbIdea[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchIdeas = async () => {
      try {
        setLoading(true);
        const url = projectId
          ? `/api/ideas?projectId=${projectId}&limit=10`
          : `/api/ideas?limit=10`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setIdeas(data.ideas || []);
        }
      } catch (error) {
        console.error('Error fetching ideas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, [projectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/10 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/10 border-red-500/30';
      case 'implemented':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-gray-700/30 border-gray-600/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="w-80 bg-gradient-to-b from-gray-900/60 to-gray-900/80 backdrop-blur-xl border-l border-gray-700/40 p-6 flex flex-col shadow-2xl"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Header */}
      <motion.div
        className="mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center space-x-3 mb-2">
          <motion.div
            className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Brain className="w-5 h-5 text-blue-400" />
          </motion.div>
          <h3 className="text-lg font-bold text-white bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
            Recent Ideas
          </h3>
        </div>
        <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-500 rounded-full ml-14"></div>
        <p className="text-xs text-gray-400 mt-2 ml-14">LLM-generated insights</p>
      </motion.div>

      {/* Ideas List */}
      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[50vh] overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No ideas yet</p>
            <p className="text-xs text-gray-600 mt-1">Run a scan to generate ideas</p>
          </div>
        ) : (
          ideas.map((idea, index) => (
            <motion.div
              key={idea.id}
              className={`group relative px-3 py-2 rounded-lg border transition-all duration-300 cursor-pointer ${getStatusColor(idea.status)} hover:scale-[1.02]`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ x: -2 }}
            >
              {/* One-row minimalistic design */}
              <div className="flex items-center justify-between gap-2">
                {/* Date */}
                <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                  {formatDate(idea.created_at)}
                </span>

                {/* Title */}
                <p className="text-sm text-white font-medium leading-tight flex-1 truncate group-hover:text-blue-300 transition-colors">
                  {idea.title}
                </p>

                {/* Status indicator dot */}
                <motion.div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    idea.status === 'accepted'
                      ? 'bg-green-400'
                      : idea.status === 'rejected'
                      ? 'bg-red-400'
                      : idea.status === 'implemented'
                      ? 'bg-amber-400'
                      : 'bg-gray-500'
                  }`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer info */}
      <motion.div
        className="mt-6 p-4 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white">Idea Stats</span>
          <motion.div
            className="w-2 h-2 bg-blue-400 rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Total</p>
            <p className="text-white font-mono font-semibold">{ideas.length}</p>
          </div>
          <div>
            <p className="text-gray-500">Accepted</p>
            <p className="text-green-400 font-mono font-semibold">
              {ideas.filter(i => i.status === 'accepted').length}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
