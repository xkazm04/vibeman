import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, X, Check, ArrowLeft, AlertCircle } from 'lucide-react';

interface Task {
  title: string;
  description: string[];
  type: 'Feature' | 'Optimization';
  reason: string;
  status?: 'accepted' | 'rejected' | 'undecided';
}

interface TaskResultDisplayProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onAcceptTask: (index: number) => void;
  onRejectTask: (index: number) => void;
  activeProject?: any;
}

export default function TaskResultDisplay({
  tasks,
  loading,
  error,
  onBack,
  onAcceptTask,
  onRejectTask,
  activeProject
}: TaskResultDisplayProps) {
  const [editedTasks, setEditedTasks] = useState<Task[]>(tasks);
  const [taskStatuses, setTaskStatuses] = useState<Record<number, 'accepted' | 'rejected' | 'undecided'>>(
    tasks.reduce((acc, _, index) => ({ ...acc, [index]: 'undecided' }), {})
  );

  // Update edited tasks when tasks prop changes
  React.useEffect(() => {
    setEditedTasks(tasks);
    setTaskStatuses(tasks.reduce((acc, _, index) => ({ ...acc, [index]: 'undecided' }), {}));
  }, [tasks]);

  const handleEditTask = (index: number, field: 'title' | 'reason', value: string) => {
    setEditedTasks(prev => prev.map((task, i) =>
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const handleEditStep = (taskIndex: number, stepIndex: number, value: string) => {
    setEditedTasks(prev => prev.map((task, i) =>
      i === taskIndex
        ? {
          ...task,
          description: task.description.map((step, j) =>
            j === stepIndex ? value : step
          )
        }
        : task
    ));
  };

  const handleSaveTask = async (index: number) => {
    if (!activeProject) return;

    const taskData = editedTasks[index];
    const status = taskStatuses[index];

    try {
      // Save to backlog database
      const response = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          title: taskData.title,
          description: taskData.reason,
          steps: taskData.description,
          status: status === 'accepted' ? 'accepted' : status,
          type: taskData.type.toLowerCase(), // Convert 'Feature' to 'feature', 'Optimization' to 'optimization'
        }),
      });

      if (response.ok) {
        console.log('Task saved successfully');
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleAccept = async (index: number) => {
    setTaskStatuses(prev => ({ ...prev, [index]: 'accepted' }));
    await handleSaveTask(index);
    onAcceptTask(index);
  };

  const handleReject = async (index: number) => {
    setTaskStatuses(prev => ({ ...prev, [index]: 'rejected' }));
    await handleSaveTask(index);
    onRejectTask(index);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <CheckSquare className="w-16 h-16 mx-auto text-purple-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Generating Implementation Tasks
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            AI is analyzing your project to identify the most valuable implementation tasks...
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div className="bg-purple-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
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
              Implementation Tasks
            </h2>
            <p className="text-sm text-gray-400">
              {tasks.length} high-impact tasks generated for your project
            </p>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="space-y-4 max-h-[80vh]">
        {editedTasks.map((task, index) => {
          const currentTask = editedTasks[index];
          const status = taskStatuses[index];


          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 hover:border-gray-600/50 transition-colors"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {status === 'undecided' ? (
                      <input
                        type="text"
                        value={currentTask.title}
                        onChange={(e) => handleEditTask(index, 'title', e.target.value)}
                        className="text-lg font-semibold text-white font-mono bg-transparent border-none flex-1 focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1"
                        placeholder="Click to edit title..."
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-white font-mono">
                        {currentTask.title}
                      </h3>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${currentTask.type === 'Feature'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                      {currentTask.type}
                    </span>
                  </div>
                  {status === 'undecided' ? (
                    <textarea
                      value={currentTask.reason}
                      onChange={(e) => handleEditTask(index, 'reason', e.target.value)}
                      className="w-full text-sm text-gray-300 bg-transparent border-none resize-none focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1 leading-relaxed"
                      rows={2}
                      placeholder="Click to edit description..."
                    />
                  ) : (
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {currentTask.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Implementation Steps */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Implementation Steps:</h4>
                <ul className="space-y-2">
                  {currentTask.description.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                      {status === 'undecided' ? (
                        <textarea
                          value={step}
                          onChange={(e) => handleEditStep(index, stepIndex, e.target.value)}
                          className="flex-1 text-sm text-gray-300 bg-transparent border-none resize-none focus:outline-none focus:bg-gray-700/50 focus:border focus:border-gray-600 focus:rounded focus:px-2 focus:py-1 leading-relaxed"
                          rows={2}
                          placeholder="Click to edit step..."
                        />
                      ) : (
                        <span className="text-sm text-gray-300 leading-relaxed">{step}</span>
                      )}
                    </li>
                  ))}
                </ul>
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
                          className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAccept(index)}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept</span>
                        </motion.button>
                      </>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="status"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${status === 'accepted'
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
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      {tasks.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            These tasks are AI-generated suggestions. Review and adapt them to your specific needs.
          </p>
        </div>
      )}
    </div>
  );
}