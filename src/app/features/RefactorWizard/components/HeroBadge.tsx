'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Share2, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import GradientButton from '@/components/ui/buttons/GradientButton';

interface HeroBadgeProps {
  /** Whether the badge is visible */
  isVisible: boolean;
  /** Callback when badge is closed */
  onClose: () => void;
  /** User's name (optional) */
  userName?: string;
  /** Number of refactoring opportunities completed */
  opportunitiesCount: number;
  /** Number of files affected */
  filesCount: number;
  /** Number of requirement batches created */
  batchCount: number;
}

/**
 * Confetti particle component
 */
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = [
    'bg-cyan-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-yellow-400',
    'bg-pink-400',
    'bg-purple-400',
  ];

  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = Math.random() * 100 - 50; // -50 to 50
  const rotation = Math.random() * 720 - 360; // -360 to 360
  const size = Math.random() * 8 + 4; // 4 to 12px

  return (
    <motion.div
      className={`absolute ${color} rounded-sm`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top: '50%',
        left: '50%',
      }}
      initial={{
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
      }}
      animate={{
        opacity: 0,
        x: x,
        y: Math.random() * -150 - 100, // -100 to -250
        rotate: rotation,
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

/**
 * HeroBadge - Celebration badge that appears when refactoring wizard completes
 *
 * Features:
 * - Confetti animation on appearance
 * - User name personalization
 * - Statistics display
 * - Share functionality
 * - Download badge option
 * - Blueprint-inspired design
 */
export default function HeroBadge({
  isVisible,
  onClose,
  userName = 'Refactor Hero',
  opportunitiesCount,
  filesCount,
  batchCount,
}: HeroBadgeProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleShare = () => {
    const text = `<‰ Just completed a refactoring plan with ${opportunitiesCount} improvements across ${filesCount} files! #CodeQuality #Refactoring`;

    if (navigator.share) {
      navigator.share({
        title: 'Refactor Hero Achievement',
        text,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(text);
      alert('Share text copied to clipboard!');
    }
  };

  const handleDownload = () => {
    // Create a simple text badge
    const badgeText = `
TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q                                           Q
Q         <Æ REFACTOR HERO BADGE <Æ         Q
Q                                           Q
Q              ${userName.padStart((userName.length + 20) / 2).padEnd(20)}              Q
Q                                           Q
Q  ( ${opportunitiesCount} Improvements Identified       Q
Q  =Á ${filesCount} Files Enhanced                  Q
Q  =æ ${batchCount} Requirement Batches Created     Q
Q                                           Q
Q        Keep up the great work! =€         Q
Q                                           Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
`;

    const blob = new Blob([badgeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refactor-hero-badge.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={onClose}
            data-testid="hero-badge-backdrop"
          />

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.5,
              rotate: 10,
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
            onClick={(e) => e.stopPropagation()}
            data-testid="hero-badge-modal"
          >
            <div className="relative bg-gradient-to-br from-black via-gray-900 to-black border-2 border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/30 p-8 w-[420px]">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                data-testid="close-hero-badge-btn"
              >
                <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </button>

              {/* Confetti */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <ConfettiParticle key={i} delay={i * 0.02} />
                  ))}
                </div>
              )}

              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl opacity-50 rounded-full" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 rounded-full flex items-center justify-center border-4 border-yellow-300/30">
                    <Trophy className="w-14 h-14 text-white drop-shadow-lg" />
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-2"
              >
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Refactor Hero!
                </h3>
              </motion.div>

              {/* User Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-6"
              >
                <p className="text-3xl font-light text-white tracking-wide">
                  {userName}
                </p>
              </motion.div>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-6" />

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 mb-6"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
                  <span className="text-gray-300 text-sm">Improvements Identified</span>
                  <span className="text-cyan-400 font-semibold text-lg">{opportunitiesCount}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-gray-300 text-sm">Files Enhanced</span>
                  <span className="text-blue-400 font-semibold text-lg">{filesCount}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                  <span className="text-gray-300 text-sm">Requirement Batches</span>
                  <span className="text-purple-400 font-semibold text-lg">{batchCount}</span>
                </div>
              </motion.div>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center mb-6"
              >
                <p className="text-gray-400 text-sm leading-relaxed">
                  Congratulations on completing your refactoring plan! Your systematic approach to code quality will make a lasting impact.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 gap-3"
              >
                <GradientButton
                  onClick={handleShare}
                  colorScheme="cyan"
                  size="sm"
                  icon={Share2}
                  iconPosition="left"
                  data-testid="share-badge-btn"
                >
                  Share
                </GradientButton>
                <GradientButton
                  onClick={handleDownload}
                  colorScheme="purple"
                  size="sm"
                  icon={Download}
                  iconPosition="left"
                  data-testid="download-badge-btn"
                >
                  Download
                </GradientButton>
              </motion.div>

              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl opacity-5"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgb(6, 182, 212) 1px, transparent 1px),
                    linear-gradient(to bottom, rgb(6, 182, 212) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
