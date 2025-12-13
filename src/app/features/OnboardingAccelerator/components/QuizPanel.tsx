'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import type { QuizQuestion } from '@/stores/onboardingAcceleratorStore';

interface QuizPanelProps {
  questions: QuizQuestion[];
  pathId: string;
  onSubmitAnswer: (data: {
    questionId: string;
    answer: string;
    timeTakenSeconds: number;
  }) => Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    feedback: string;
    points_earned: number;
  }>;
  onComplete: () => void;
}

interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
  pointsEarned: number;
  correctAnswer: string;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  questions,
  pathId,
  onSubmitAnswer,
  onComplete,
}) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [totalScore, setTotalScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];

  // Reset timer when question changes
  useEffect(() => {
    setStartTime(Date.now());
    setSelectedAnswer('');
    setResult(null);
  }, [currentIndex]);

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    setIsSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    try {
      const response = await onSubmitAnswer({
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        timeTakenSeconds: timeTaken,
      });

      setResult({
        questionId: currentQuestion.id,
        isCorrect: response.isCorrect,
        feedback: response.feedback,
        pointsEarned: response.points_earned,
        correctAnswer: response.correctAnswer,
      });

      setTotalScore(prev => prev + response.points_earned);
      if (response.isCorrect) {
        setTotalCorrect(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setTotalScore(0);
    setTotalCorrect(0);
    setIsComplete(false);
  };

  // Completion screen
  if (isComplete) {
    const percentage = Math.round((totalCorrect / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <motion.div
        className="flex flex-col items-center justify-center p-8 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
          <Trophy className={`w-10 h-10 ${passed ? 'text-green-400' : 'text-amber-400'}`} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {passed ? 'Quiz Complete!' : 'Keep Learning!'}
        </h2>
        <p className="text-gray-400 mb-6">
          You scored {totalCorrect} out of {questions.length} ({percentage}%)
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">{totalScore}</p>
            <p className="text-sm text-gray-400">Total Points</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">{percentage}%</p>
            <p className="text-sm text-gray-400">Score</p>
          </div>
        </div>
        <div className="flex gap-3">
          {!passed && (
            <motion.button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="retry-quiz-btn"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </motion.button>
          )}
          <motion.button
            onClick={onComplete}
            className={`px-4 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white flex items-center gap-2`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="complete-quiz-btn"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No quiz questions available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className={`w-5 h-5 ${colors.text}`} />
          <span className="text-sm text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Trophy className="w-4 h-4" />
            {totalScore} pts
          </div>
        </div>
      </div>

      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors.primary}`}
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="p-6 bg-gray-800/50 border border-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs rounded ${
            currentQuestion.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
            currentQuestion.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {currentQuestion.difficulty}
          </span>
          <span className="text-xs text-gray-500">
            {currentQuestion.points} points
          </span>
        </div>
        <h3 className="text-lg text-white font-medium">{currentQuestion.question}</h3>

        {/* Code snippet if present */}
        {currentQuestion.code_snippet && (
          <pre className="mt-4 p-4 bg-gray-900 rounded-lg overflow-x-auto text-sm text-gray-300 font-mono">
            <code>{currentQuestion.code_snippet}</code>
          </pre>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const showResult = result !== null;
          const isCorrect = option.id === result?.correctAnswer;
          const isWrongSelected = showResult && isSelected && !isCorrect;

          return (
            <motion.button
              key={option.id}
              onClick={() => !showResult && setSelectedAnswer(option.id)}
              disabled={showResult || isSubmitting}
              className={`
                w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3
                ${showResult && isCorrect ? 'border-green-500 bg-green-500/10' : ''}
                ${isWrongSelected ? 'border-red-500 bg-red-500/10' : ''}
                ${!showResult && isSelected ? `border-2 ${colors.border} ${colors.bg}` : ''}
                ${!showResult && !isSelected ? 'border-gray-700/50 bg-gray-800/30 hover:bg-gray-800/50' : ''}
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
              `}
              whileHover={!showResult ? { scale: 1.01 } : {}}
              whileTap={!showResult ? { scale: 0.99 } : {}}
              data-testid={`quiz-option-${option.id}`}
            >
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${showResult && isCorrect ? 'border-green-500 bg-green-500' : ''}
                ${isWrongSelected ? 'border-red-500 bg-red-500' : ''}
                ${!showResult && isSelected ? colors.border : 'border-gray-600'}
              `}>
                {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-white" />}
                {isWrongSelected && <XCircle className="w-4 h-4 text-white" />}
                {!showResult && isSelected && <div className={`w-3 h-3 rounded-full ${colors.accent}`} />}
              </div>
              <span className={`flex-1 ${showResult && isCorrect ? 'text-green-400' : isWrongSelected ? 'text-red-400' : 'text-white'}`}>
                {option.text}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-lg ${result.isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className={`font-medium ${result.isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
                {result.isCorrect ? 'Correct!' : 'Not quite...'}
              </span>
              <span className="text-sm text-gray-400">
                +{result.pointsEarned} points
              </span>
            </div>
            <p className="text-sm text-gray-300">{result.feedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!result ? (
          <motion.button
            onClick={handleSubmit}
            disabled={!selectedAnswer || isSubmitting}
            className={`px-6 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="submit-answer-btn"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Submit Answer'
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={handleNext}
            className={`px-6 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="next-question-btn"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
};
