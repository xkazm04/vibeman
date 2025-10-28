'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';

interface ConvTestQuestionsProps {
  questions: string[];
  currentIndex: number;
  isPlaying: boolean;
  onQuestionsChange: (questions: string[]) => void;
}

export default function ConvTestQuestions({
  questions,
  currentIndex,
  isPlaying,
  onQuestionsChange
}: ConvTestQuestionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<string[]>(questions);

  const handleEdit = () => {
    setEditedQuestions([...questions]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Save to file via API
    try {
      const response = await fetch('/api/voicebot/test-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: editedQuestions })
      });

      if (response.ok) {
        onQuestionsChange(editedQuestions);
        setIsEditing(false);
      } else {
        console.error('Failed to save questions');
      }
    } catch (error) {
      console.error('Error saving questions:', error);
    }
  };

  const handleCancel = () => {
    setEditedQuestions([...questions]);
    setIsEditing(false);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...editedQuestions];
    updated[index] = value;
    setEditedQuestions(updated);
  };

  const handleAddQuestion = () => {
    setEditedQuestions([...editedQuestions, '']);
  };

  const handleDeleteQuestion = (index: number) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-400">Test Questions</h4>
        {!isPlaying && (
          <button
            onClick={isEditing ? handleSave : handleEdit}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            {isEditing ? (
              <>
                <Save className="w-3 h-3" />
                Save
              </>
            ) : (
              <>
                <Edit2 className="w-3 h-3" />
                Edit
              </>
            )}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {editedQuestions.map((question, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  placeholder={`Question ${index + 1}`}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleDeleteQuestion(index)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleAddQuestion}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Question
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="viewing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2"
          >
            {questions.map((sentence, index) => (
              <div
                key={index}
                className={`px-2 py-1 rounded text-sm ${
                  index === currentIndex && isPlaying
                    ? 'bg-blue-900 border border-blue-500 text-white'
                    : index < currentIndex && isPlaying
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-700 text-gray-300'
                }`}
                title={sentence}
              >
                Q{index + 1}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar - Moved here */}
      <div className="mt-3">
        <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentIndex / questions.length) * 100}%` }}
          />
        </div>
        <div className="text-sm text-gray-400 text-right">
          {currentIndex} / {questions.length}
        </div>
      </div>
    </div>
  );
}
