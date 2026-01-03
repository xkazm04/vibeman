'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Star, PartyPopper, Rocket } from 'lucide-react';

interface ProgressCelebrationProps {
  trigger: boolean;
  milestone: '25%' | '50%' | '75%' | '100%' | 'step';
  onComplete?: () => void;
}

// Confetti particle component
function ConfettiParticle({
  delay,
  color,
  startX,
}: {
  delay: number;
  color: string;
  startX: number;
}) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: `${startX}%` }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, 400],
        x: [0, Math.random() * 100 - 50],
        opacity: [1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      }}
      transition={{
        duration: 2 + Math.random(),
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

// Emoji burst component
function EmojiBurst({ emoji, delay }: { emoji: string; delay: number }) {
  return (
    <motion.div
      className="absolute text-2xl"
      style={{
        left: `${20 + Math.random() * 60}%`,
        top: '50%',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.5, 1],
        opacity: [0, 1, 0],
        y: [0, -100],
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
    >
      {emoji}
    </motion.div>
  );
}

const CONFETTI_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const CELEBRATION_EMOJIS = ['🎉', '🎊', '✨', '🌟', '🚀', '💫', '🏆', '⭐'];

/**
 * ProgressCelebration - Celebration animations for milestones
 */
export default function ProgressCelebration({
  trigger,
  milestone,
  onComplete,
}: ProgressCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!isVisible) return null;

  // Different celebrations for different milestones
  const getMilestoneConfig = () => {
    switch (milestone) {
      case '25%':
        return {
          icon: <Star className="w-12 h-12 text-yellow-400" />,
          message: 'Great start!',
          subMessage: "You're 25% through onboarding",
          confettiCount: 15,
          emojiCount: 3,
        };
      case '50%':
        return {
          icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
          message: 'Halfway there!',
          subMessage: "You're making great progress",
          confettiCount: 25,
          emojiCount: 5,
        };
      case '75%':
        return {
          icon: <Rocket className="w-12 h-12 text-purple-400" />,
          message: 'Almost done!',
          subMessage: 'Just a few more steps',
          confettiCount: 35,
          emojiCount: 7,
        };
      case '100%':
        return {
          icon: <Trophy className="w-14 h-14 text-amber-400" />,
          message: 'Congratulations!',
          subMessage: "You've completed onboarding!",
          confettiCount: 50,
          emojiCount: 10,
        };
      case 'step':
      default:
        return {
          icon: <PartyPopper className="w-10 h-10 text-green-400" />,
          message: 'Step complete!',
          subMessage: 'Keep going!',
          confettiCount: 10,
          emojiCount: 2,
        };
    }
  };

  const config = getMilestoneConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      >
        {/* Confetti particles */}
        {Array.from({ length: config.confettiCount }).map((_, i) => (
          <ConfettiParticle
            key={`confetti-${i}`}
            delay={Math.random() * 0.5}
            color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
            startX={Math.random() * 100}
          />
        ))}

        {/* Emoji bursts */}
        {Array.from({ length: config.emojiCount }).map((_, i) => (
          <EmojiBurst
            key={`emoji-${i}`}
            emoji={CELEBRATION_EMOJIS[i % CELEBRATION_EMOJIS.length]}
            delay={0.2 + i * 0.15}
          />
        ))}

        {/* Central message */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                     flex flex-col items-center gap-4 p-8 bg-gray-900/90 backdrop-blur-xl
                     rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {config.icon}
          </motion.div>
          <div className="text-center">
            <motion.h2
              className="text-2xl font-bold text-white"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {config.message}
            </motion.h2>
            <motion.p
              className="text-gray-400 mt-1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {config.subMessage}
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * useProgressCelebration - Hook to trigger celebrations based on progress
 */
export function useProgressCelebration(projectId: string) {
  const [celebration, setCelebration] = useState<{
    trigger: boolean;
    milestone: '25%' | '50%' | '75%' | '100%' | 'step';
  }>({ trigger: false, milestone: 'step' });

  const [previousProgress, setPreviousProgress] = useState<number | null>(null);

  const checkMilestone = useCallback(
    (completedCount: number, totalSteps: number) => {
      const percentage = (completedCount / totalSteps) * 100;

      // Determine if we crossed a milestone
      const milestones = [
        { threshold: 100, milestone: '100%' as const },
        { threshold: 75, milestone: '75%' as const },
        { threshold: 50, milestone: '50%' as const },
        { threshold: 25, milestone: '25%' as const },
      ];

      if (previousProgress !== null && previousProgress < percentage) {
        for (const { threshold, milestone } of milestones) {
          if (previousProgress < threshold && percentage >= threshold) {
            setCelebration({ trigger: true, milestone });
            break;
          }
        }
      }

      setPreviousProgress(percentage);
    },
    [previousProgress]
  );

  const triggerStepCelebration = useCallback(() => {
    setCelebration({ trigger: true, milestone: 'step' });
  }, []);

  const clearCelebration = useCallback(() => {
    setCelebration({ trigger: false, milestone: 'step' });
  }, []);

  return {
    celebration,
    checkMilestone,
    triggerStepCelebration,
    clearCelebration,
  };
}

/**
 * MiniCelebration - Small inline celebration effect
 */
export function MiniCelebration({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className="relative inline-block">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
