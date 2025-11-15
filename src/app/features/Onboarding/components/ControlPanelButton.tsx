'use client';

import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { useThemeStore } from '@/stores/themeStore';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});


interface ControlPanelButtonProps {
  onClick: () => void;
  tasksCompleted: number;
  totalTasks: number;
  isOpen: boolean;
}

export default function ControlPanelButton({
  onClick,
  tasksCompleted,
  totalTasks,
  isOpen
}: ControlPanelButtonProps) {
  const progress = (tasksCompleted / totalTasks) * 100;
  const isComplete = tasksCompleted >= totalTasks;
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, x: isOpen ? -5 : 5 }}
      whileTap={{ scale: 0.95 }}
      className="relative group cursor-pointer"
    >
      {/* Button container */}
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 border ${colors.shadow} transition-all duration-300 backdrop-blur-md`}
        style={{
          borderColor: `${colors.baseColor}4D`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${colors.baseColor}80`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${colors.baseColor}4D`;
        }}
      >

        {/* Text */}
        <div className="flex flex-col items-start">
          <span className={`${caveat.className} text-sm font-semibold ${colors.textLight}`}>
            BLUEPRINT
          </span>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-16 h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  background: isComplete
                    ? 'linear-gradient(to right, #4ade80, #34d399)'
                    : `linear-gradient(to right, ${colors.baseColor}, ${colors.baseColor}CC)`,
                }}
                className="h-full"
              />
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {totalTasks}
            </span>
          </div>
        </div>

        {/* Chevron indicator */}
        <motion.div
          animate={{ x: isOpen ? -2 : 2 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <ChevronLeft className={`w-4 h-4 ${colors.text}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${colors.text}`} />
          )}
        </motion.div>
      </div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
        style={{
          backgroundColor: `${colors.baseColor}33`,
        }}
        animate={{
          opacity: isOpen ? [0.3, 0.5, 0.3] : 0,
        }}
        transition={{
          duration: 2,
          repeat: isOpen ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      {/* Scanning lines effect when incomplete */}
      {!isComplete && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div
            className="h-full w-0.5 absolute left-0 animate-[scan_3s_linear_infinite]"
            style={{
              background: `linear-gradient(to bottom, transparent, ${colors.baseColor}, transparent)`,
            }}
          />
        </motion.div>
      )}
      <span className={`${caveat.className} text-xs font-semibold ${colors.textLight}`}>
        CTRL+B
      </span>
    </motion.button>
  );
}
