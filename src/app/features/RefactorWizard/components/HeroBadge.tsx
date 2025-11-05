'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Share2, Download, X, Twitter, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeroBadgeProps {
  isVisible: boolean;
  onClose: () => void;
  userName?: string;
  opportunitiesCount: number;
  filesCount: number;
}

/**
 * HeroBadge - Celebration badge that appears when refactor wizard completes
 *
 * Features:
 * - Animated entrance with confetti effect
 * - Personalized congratulatory message
 * - Share functionality for social media
 * - Download badge as image
 */
export default function HeroBadge({
  isVisible,
  onClose,
  userName = 'Developer',
  opportunitiesCount,
  filesCount,
}: HeroBadgeProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      // Stop confetti after animation completes
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleShare = (platform: 'twitter' | 'slack') => {
    const message = `Just completed a refactor scan with ${opportunitiesCount} improvements across ${filesCount} files! 🚀 #CodeQuality #Refactoring`;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'slack') {
      // Copy to clipboard for Slack
      navigator.clipboard.writeText(message);
      alert('Message copied to clipboard! Paste it in Slack.');
    }
  };

  const handleDownload = () => {
    // In a real implementation, this would capture the badge as an image
    // For now, we'll just show a message
    alert('Badge download feature coming soon!');
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            onClick={onClose}
            data-testid="hero-badge-backdrop"
          />

          {/* Confetti */}
          {showConfetti && (
            <div className="fixed inset-0 z-[101] pointer-events-none" data-testid="confetti-container">
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    opacity: 0,
                    scale: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    ease: 'easeOut',
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: [
                      '#06b6d4', // cyan
                      '#3b82f6', // blue
                      '#8b5cf6', // purple
                      '#ec4899', // pink
                      '#f59e0b', // amber
                    ][Math.floor(Math.random() * 5)],
                  }}
                />
              ))}
            </div>
          )}

          {/* Badge Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative bg-gradient-to-br from-black via-gray-900 to-black border-2 border-cyan-500/50 rounded-3xl shadow-2xl shadow-cyan-500/30 p-8 max-w-md w-full"
              data-testid="hero-badge-card"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                data-testid="hero-badge-close-btn"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>

              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'backOut' }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full blur-2xl opacity-50" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center border-4 border-yellow-300/30">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Hero Illustration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-6"
              >
                <div className="relative inline-block">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur-xl opacity-30" />

                  {/* ASCII Art Hero */}
                  <pre className="relative font-mono text-cyan-400 text-xs leading-tight bg-black/50 p-4 rounded-lg border border-cyan-500/20">
{`    ⚡
   /|\\
  / | \\
    |
   / \\
  /   \\`}
                  </pre>
                </div>
              </motion.div>

              {/* Congratulations Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center mb-6"
              >
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
                  Refactor Hero!
                </h2>
                <p className="text-lg text-white font-medium mb-1">
                  {userName}
                </p>
                <p className="text-sm text-gray-400">
                  Just completed an epic refactoring mission
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{opportunitiesCount}</div>
                  <div className="text-xs text-gray-400 mt-1">Improvements</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">{filesCount}</div>
                  <div className="text-xs text-gray-400 mt-1">Files Scanned</div>
                </div>
              </motion.div>

              {/* Congratulatory Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-xl p-4 mb-6"
              >
                <p className="text-sm text-gray-300 text-center leading-relaxed">
                  🎉 Congratulations! You've identified <strong className="text-white">{opportunitiesCount}</strong> opportunities to improve your codebase.
                  Your dedication to code quality is inspiring!
                </p>
              </motion.div>

              {/* Share Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="flex gap-3"
              >
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 group"
                  data-testid="share-twitter-btn"
                >
                  <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Share
                </button>
                <button
                  onClick={() => handleShare('slack')}
                  className="flex-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 group"
                  data-testid="share-slack-btn"
                >
                  <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Slack
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-gray-500/20 to-gray-600/20 hover:from-gray-500/30 hover:to-gray-600/30 border border-gray-500/30 hover:border-gray-500/50 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 group"
                  data-testid="download-badge-btn"
                >
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
