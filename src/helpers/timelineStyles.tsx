import { Goal } from "@/types";
import { motion } from "framer-motion";
import { HammerIcon } from "lucide-react";

const getSelectedStyles = () =>
  'shadow-2xl shadow-yellow-400/80 ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-transparent scale-110 brightness-125';

const getHoverStyles = () =>
  'hover:scale-110 hover:brightness-110';

const getYellowGradientStyles = () =>
  'bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 border-yellow-500';

export const getStatusStyle = (status: Goal['status'], isSelected: boolean) => {
    const baseClasses = "w-4 h-4 rounded-full border cursor-pointer transition-all duration-500 flex items-center justify-center relative";
    const yellowGradient = getYellowGradientStyles();
    const conditionalStyles = isSelected ? getSelectedStyles() : getHoverStyles();

    switch (status) {
      case 'done':
        return `${baseClasses} ${yellowGradient} ${conditionalStyles}`;
      case 'in_progress':
        return `${baseClasses} ${yellowGradient} shadow-lg shadow-yellow-600/50 ${conditionalStyles}`;
      case 'open':
        return `${baseClasses} ${yellowGradient} ${conditionalStyles}`;
      default:
        return baseClasses;
    }
  };

const createAnimatedIcon = (content: React.ReactNode, className: string) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.2 }}
    className={className}
  >
    {content}
  </motion.div>
);

export const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return createAnimatedIcon('✓', 'text-green-300 text-sm font-bold');
      case 'in_progress':
        return createAnimatedIcon(<HammerIcon size={12} />, 'text-yellow-300 text-sm font-bold');
      case 'open':
        return null; // No icon for open
      default:
        return null;
    }
  };