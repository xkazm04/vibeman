import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        className={`${sizeClasses[size]} border-4 ${colors.borderLight} border-t-current rounded-full`}
        style={{ borderTopColor: colors.baseColor }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-400 font-mono"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
