/**
 * Launch Sequence
 * Dramatic full-screen animation overlay when batch execution begins.
 * Counts down T-3, T-2, T-1, LAUNCH with particle effects.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { playLaunchSweep } from '../lib/audioManager';

interface LaunchSequenceProps {
  isActive: boolean;
  taskCount: number;
  onComplete: () => void;
  audioEnabled?: boolean;
}

const COUNTDOWN_STEPS = ['T-3', 'T-2', 'T-1', 'LAUNCH'];
const STEP_DURATION = 700;

export default function LaunchSequence({ isActive, taskCount, onComplete, audioEnabled }: LaunchSequenceProps) {
  const [step, setStep] = useState(-1);

  const runSequence = useCallback(() => {
    if (audioEnabled) playLaunchSweep();

    let current = 0;
    setStep(0);

    const timer = setInterval(() => {
      current++;
      if (current >= COUNTDOWN_STEPS.length) {
        clearInterval(timer);
        setTimeout(onComplete, 600);
      } else {
        setStep(current);
      }
    }, STEP_DURATION);

    return () => clearInterval(timer);
  }, [onComplete, audioEnabled]);

  useEffect(() => {
    if (isActive) {
      const cleanup = runSequence();
      return cleanup;
    } else {
      setStep(-1);
    }
  }, [isActive, runSequence]);

  if (!isActive || step < 0) return null;

  const isLaunch = step === COUNTDOWN_STEPS.length - 1;
  const label = COUNTDOWN_STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radiating rings */}
        {isLaunch && (
          <>
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                initial={{ scale: 0.5, opacity: 0.5 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1.2, delay: ring * 0.15 }}
                className="absolute w-32 h-32 rounded-full border border-cyan-500/40"
              />
            ))}
          </>
        )}

        {/* Countdown text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="text-center"
          >
            <div className={`font-mono font-bold tracking-wider ${
              isLaunch
                ? 'text-6xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-transparent bg-clip-text'
                : 'text-5xl text-gray-200'
            }`}>
              {label}
            </div>

            {isLaunch && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 mt-4"
              >
                <Rocket className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-cyan-300 font-mono">
                  Deploying {taskCount} task{taskCount !== 1 ? 's' : ''} across fleet
                </span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Particle streams on launch */}
        {isLaunch && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
                initial={{
                  x: '50%',
                  y: '50%',
                  opacity: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1 + Math.random(),
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
