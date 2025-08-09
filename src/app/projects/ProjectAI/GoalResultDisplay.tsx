import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, Check, ArrowLeft, AlertCircle, TrendingUp, Zap, Edit2, Save } from 'lucide-react';

interface Goal {
  title: string;
  description: string[];
  type: 'Business' | 'Technical';
  reason: string;
  status?: 'accepted' | 'rejected' | 'undecided';
}

interface GoalResultDisplayProps {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onAcceptGoal: (index: number) => void;
  onRejectGoal: (index: number) => void;
  activeProject?: any;
}

export default function GoalResultDisplay({ 
  goals, 
  loading, 
  error, 
  onBack, 
  onAcceptGoal, 
  onRejectGoal,
  activeProject 
}: GoalResultDisplayProps) {
  const [editedGoals, setEditedGoals] = useState<Goal[]>(goals);
  const [goalStatuses, setGoalStatuses] = useState<Record<number, 'accepted' | 'rejected' | 'undecided'>>(
    goals.reduce((acc, _, index) => ({ ...acc, [index]: 'undecided' }), {})
  );

  // Update edited goals when goals prop changes
  React.useEffect(() => {
    setEditedGoals(goals);
    setGoalStatuses(goals.reduce((acc, _, index) => ({ ...acc, [index]: 'undecided' }), {}));
  }, [goals]);

  const handleEditGoal = (index: number, field: 'title' | 'reason', value: string) => {
    setEditedGoals(prev => prev.map((goal, i) => 
      i === index ? { ...goal, [field]: value } : goal
    ));
  };

  const handleEditMilestone = (goalIndex: number, milestoneIndex: number, value: string) => {
    setEditedGoals(prev => prev.map((goal, i) => 
      i === goalIndex 
        ? { 
            ...goal, 
            description: goal.description.map((milestone, j) => 
              j === milestoneIndex ? value : milestone
            )
          }
        : goal
    ));
  };

  const handleSaveGoal = async (index: number) => {
    if (!activeProject) return;

    const goal = editedGoals[index];
    const status = goalStatuses[index];

    try {
      // Save to database
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          title: goal.title,
          description: JSON.stringify({
            type: goal.type,
            reason: goal.reason,
            milestones: goal.description
          }),
          status: status === 'accepted' ? 'open' : status,
          orderIndex: index + 1
        }),
      });

      if (response.ok) {
        console.log('Goal saved successfully');
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleAccept = async (index: number) => {
    setGoalStatuses(prev => ({ ...prev, [index]: 'accepted' }));
    await handleSaveGoal(index);
    onAcceptGoal(index);
  };

  const handleReject = async (index: number) => {
    setGoalStatuses(prev => ({ ...prev, [index]: 'rejected' }));
    await handleSaveGoal(index);
    onRejectGoal(index);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <Target className="w-16 h-16 mx-auto text-amber-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Generating Strategic Goals
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            AI is analyzing your project to identify transformative strategic directions...
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div className="bg-amber-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-3">
            Generation Failed
          </h3>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Selection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-white font-mono">
              Strategic Goals
            </h2>
            <p className="text-sm text-gray-400">
              {goals.length} transformative directions for your project
            </p>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="space-y-6">
        {editedGoals.map((goal, index) => {
          const currentGoal = editedGoals[index];
          const status = goalStatuses[index];

          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all duration-300 relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 30% 70%, currentColor 1px, transparent 1px)`,
                  backgroundSize: '24px 24px'
                }}></div>
              </div>

              {/* Goal Header */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        currentGoal.type === 'Business' 
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-purple-500/20 border border-purple-500/30'
                      }`}>
                        {currentGoal.type === 'Business' ? (
                          <TrendingUp className={`w-4 h-4 ${
                            currentGoal.type === 'Business' ? 'text-blue-400' : 'text-purple-400'
                          }`} />
                        ) : (
                          <Zap className={`w-4 h-4 ${
                            currentGoal.type === 'Business' ? 'text-blue-400' : 'text-purple-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        {status === 'undecided' ? (
                          <input
                            type="text"
                            value={currentGoal.title}
                            onChange={(e) => handleEditGoal(index, 'title', e.target.value)}
                            className="text-xl font-bold text-white font-mono bg-transparent border-none w-full focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1"
                            placeholder="Click to edit title..."
                          />
                        ) : (
                          <h3 className="text-xl font-bold text-white font-mono">
                            {currentGoal.title}
                          </h3>
                        )}
                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium mt-1 ${
                          currentGoal.type === 'Business' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {currentGoal.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Strategic Value */}
                    <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                      <h4 className="text-sm font-medium text-gray-300 mb-1">Strategic Value:</h4>
                      {status === 'undecided' ? (
                        <textarea
                          value={currentGoal.reason}
                          onChange={(e) => handleEditGoal(index, 'reason', e.target.value)}
                          className="w-full text-sm text-gray-300 bg-transparent border-none resize-none focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1 leading-relaxed"
                          rows={2}
                          placeholder="Click to edit strategic value..."
                        />
                      ) : (
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {currentGoal.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Implementation Milestones */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span>Key Milestones:</span>
                  </h4>
                  <div className="space-y-3">
                    {currentGoal.description.map((milestone, milestoneIndex) => (
                      <div key={milestoneIndex} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            currentGoal.type === 'Business' ? 'bg-blue-400' : 'bg-purple-400'
                          }`}></div>
                        </div>
                        <div className="flex-1">
                          {status === 'undecided' ? (
                            <textarea
                              value={milestone}
                              onChange={(e) => handleEditMilestone(index, milestoneIndex, e.target.value)}
                              className="w-full text-sm text-gray-300 bg-transparent border-none resize-none focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1 leading-relaxed"
                              rows={2}
                              placeholder="Click to edit milestone..."
                            />
                          ) : (
                            <p className="text-sm text-gray-300 leading-relaxed">{milestone}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons or Status */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700/30">
                  <AnimatePresence mode="wait">
                    {status === 'undecided' ? (
                      <motion.div
                        key="buttons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-3"
                      >
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReject(index)}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            <X className="w-3 h-3" />
                            <span>Not Relevant</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAccept(index)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
                          >
                            <Check className="w-3 h-3" />
                            <span>Add to Roadmap</span>
                          </motion.button>
                        </>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="status"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                          status === 'accepted' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {status === 'accepted' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Accepted</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            <span>Rejected</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      {goals.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            These strategic directions are AI-generated based on your project analysis. 
            Consider market conditions and resources when implementing.
          </p>
        </div>
      )}
    </div>
  );
}